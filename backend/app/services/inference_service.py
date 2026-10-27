import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from bson import ObjectId
import pandas as pd
from fastapi import HTTPException, status, BackgroundTasks

from app.config.paths import ANALYSIS_RESULTS_DIR
from app.database.mongodb import (
    get_analyses_collection,
    get_predictions_collection,
    get_alerts_collection,
    get_turbines_collection,
    get_datasets_collection,
)
from app.ml.edge_adapter import EdgeAdapter
from app.ml.model_manager import model_manager
from app.ml.result_adapter import sanitize_record, sanitize_records
from app.models.analysis import create_analysis_document
from app.models.prediction import create_prediction_document
from app.models.alert import create_alert_document
from app.models.turbine import create_turbine_document
from app.schemas.prediction import SingleInferenceRequest, SingleInferenceResponse, PredictionRecord
from app.schemas.analysis import (
    BatchInferenceRequest,
    BatchInferenceResponse,
    AnalysisStatusResponse,
    AnalysisResultsResponse,
)

logger = logging.getLogger("wind_turbine_ai.inference_service")


class InferenceService:
    @classmethod
    def run_single(cls, req: SingleInferenceRequest) -> SingleInferenceResponse:
        """Execute single SCADA sample inference via EdgeAdapter."""
        farm = req.farm or "A"
        raw_result = EdgeAdapter.run_inference_single(
            farm=farm,
            features=req.features,
            actual_power=req.actual_power,
            asset_id=req.asset_id or "WTG_01",
            timestamp=req.timestamp,
        )
        clean_result = sanitize_record(raw_result)
        return SingleInferenceResponse(**clean_result)

    @classmethod
    async def queue_batch(
        cls,
        req: BatchInferenceRequest,
        current_user: dict,
        background_tasks: BackgroundTasks,
    ) -> BatchInferenceResponse:
        """Validate dataset compatibility and queue asynchronous batch analysis."""
        datasets = get_datasets_collection()
        try:
            oid = ObjectId(req.dataset_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid dataset ID format.")

        dataset_doc = await datasets.find_one({"_id": oid, "user_id": current_user["_id"]})
        if not dataset_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")

        # Determine farm
        farm = req.farm or dataset_doc.get("farm") or "A"

        # Check compatibility
        if not dataset_doc.get("compatible", False) and not req.farm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incompatible dataset. Cannot run wind turbine model pipeline on non-compliant data. "
                       "Please review dataset compatibility at /api/datasets/{id}/compatibility.",
            )

        analyses = get_analyses_collection()
        analysis_doc = create_analysis_document(
            user_id=current_user["_id"],
            dataset_id=dataset_doc["_id"],
            farm=farm,
            status="queued",
        )
        res = await analyses.insert_one(analysis_doc)
        analysis_id = str(res.inserted_id)

        # Trigger background execution
        background_tasks.add_task(
            cls._process_batch_task,
            analysis_id=analysis_id,
            dataset_file_path=dataset_doc["file_path"],
            farm=farm,
            user_id=str(current_user["_id"]),
            asset_col=dataset_doc.get("detected_asset_col"),
            time_col=dataset_doc.get("detected_timestamp_col"),
        )

        return BatchInferenceResponse(
            analysis_id=analysis_id,
            status="queued",
            message="Batch inference job successfully queued.",
        )

    @classmethod
    async def _process_batch_task(
        cls,
        analysis_id: str,
        dataset_file_path: str,
        farm: str,
        user_id: str,
        asset_col: Optional[str] = None,
        time_col: Optional[str] = None,
    ) -> None:
        """Background worker to run batch inference, persist predictions, alerts, and turbines."""
        analyses = get_analyses_collection()
        predictions_col = get_predictions_collection()
        alerts_col = get_alerts_collection()
        turbines_col = get_turbines_collection()

        a_oid = ObjectId(analysis_id)
        u_oid = ObjectId(user_id)

        try:
            logger.info(f"Starting batch analysis {analysis_id} for farm {farm}...")
            await analyses.update_one(
                {"_id": a_oid},
                {"$set": {"status": "processing", "progress": 10}},
            )

            file_p = Path(dataset_file_path)
            if not file_p.exists():
                raise FileNotFoundError(f"Dataset file '{dataset_file_path}' does not exist on disk.")

            try:
                with open(file_p, "r", encoding="utf-8", errors="ignore") as f:
                    first_line = f.readline()
                sep = ";" if ";" in first_line else ","
                df = pd.read_csv(file_p, sep=sep)
            except Exception:
                df = pd.read_csv(file_p)
            await analyses.update_one({"_id": a_oid}, {"$set": {"progress": 30, "total_rows": len(df)}})

            # Auto-detect timestamp and asset column from DataFrame if not preset
            if not time_col or time_col not in df.columns:
                for c in ["time_stamp", "timestamp", "datetime", "date_time", "time", "date"]:
                    if c in df.columns:
                        time_col = c
                        break
            if not asset_col or asset_col not in df.columns:
                for c in ["asset_id", "turbine_id", "turbine", "asset"]:
                    if c in df.columns:
                        asset_col = c
                        break

            # Run inference through edge adapter
            records, summary = EdgeAdapter.run_inference_df(
                farm=farm,
                df=df,
                asset_col=asset_col,
                timestamp_col=time_col,
            )

            await analyses.update_one({"_id": a_oid}, {"$set": {"progress": 70}})

            # Save full results to disk
            ANALYSIS_RESULTS_DIR.mkdir(parents=True, exist_ok=True)
            results_path = ANALYSIS_RESULTS_DIR / f"{analysis_id}.json"
            clean_records = sanitize_records(records)
            with open(results_path, "w", encoding="utf-8") as f:
                json.dump({"summary": summary, "predictions": clean_records}, f)

            # Store sample predictions and alerts in MongoDB
            pred_docs = []
            alert_docs = []
            turbine_tracker: Dict[str, Dict[str, Any]] = {}

            now = datetime.now(timezone.utc)
            for r in clean_records:
                ts = r.get("timestamp")
                if ts and str(ts) != "None":
                    try:
                        dt_ts = datetime.fromisoformat(str(ts).replace(" ", "T"))
                    except Exception:
                        dt_ts = now
                else:
                    dt_ts = now

                pred_docs.append({
                    "analysis_id": a_oid,
                    "asset_id": r["asset_id"],
                    "timestamp": dt_ts,
                    "actual_power": r["actual_power"],
                    "expected_power": r["expected_power"],
                    "residual": r["residual"],
                    "anomaly_score": r["anomaly_score"],
                    "health_index": r["health_index"],
                    "risk_score": r["risk_score"],
                    "risk_category": r["risk_category"],
                    "dominant_component": r["dominant_component"],
                })

                # Track latest status per turbine
                turbine_tracker[r["asset_id"]] = {
                    "health_index": r["health_index"],
                    "risk_score": r["risk_score"],
                    "risk_category": r["risk_category"],
                    "dominant_component": r["dominant_component"],
                    "timestamp": dt_ts,
                }

            # Group elevated risk records into distinct operational incident alerts
            # to prevent spamming thousands of 10-minute historical rows as separate alerts
            incident_map: Dict[str, Dict[str, Any]] = {}
            for r in clean_records:
                if r["risk_category"] in ["HIGH", "CRITICAL"]:
                    key = f"{r['asset_id']}_{r['dominant_component']}_{r['risk_category']}"
                    if key not in incident_map or r["risk_score"] > incident_map[key]["risk_score"]:
                        ts = r.get("timestamp")
                        dt_ts = datetime.fromisoformat(ts) if ts and ts != "None" else now
                        incident_map[key] = {
                            "asset_id": r["asset_id"],
                            "timestamp": dt_ts,
                            "severity": r["risk_category"],
                            "risk_score": r["risk_score"],
                            "component": r["dominant_component"],
                            "anomaly_score": r["anomaly_score"],
                            "message": f"{r['risk_category']} priority maintenance alert on turbine {r['asset_id']} "
                                       f"(Dominant degraded subsystem: {r['dominant_component']}).",
                        }

            alert_docs = [
                create_alert_document(
                    analysis_id=a_oid,
                    asset_id=inc["asset_id"],
                    timestamp=inc["timestamp"],
                    severity=inc["severity"],
                    risk_score=inc["risk_score"],
                    component=inc["component"],
                    anomaly_score=inc["anomaly_score"],
                    message=inc["message"],
                )
                for inc in incident_map.values()
            ]

            # Batch insert predictions (limit to 500 in MongoDB for fast queries, rest in analysis file)
            if pred_docs:
                await predictions_col.insert_many(pred_docs[:500])

            # Batch insert alerts
            if alert_docs:
                await alerts_col.insert_many(alert_docs)

            # Upsert turbines
            for turb_id, t_info in turbine_tracker.items():
                await turbines_col.update_one(
                    {"user_id": u_oid, "turbine_id": turb_id},
                    {
                        "$set": {
                            "farm": farm,
                            "name": f"Turbine {turb_id}",
                            "latest_health": t_info["health_index"],
                            "latest_risk": t_info["risk_score"],
                            "latest_risk_category": t_info["risk_category"],
                            "dominant_component": t_info["dominant_component"],
                            "latest_prediction_timestamp": t_info["timestamp"],
                            "updated_at": now,
                        },
                        "$setOnInsert": {
                            "created_at": now,
                            "latitude": None,
                            "longitude": None,
                        },
                    },
                    upsert=True,
                )

            # Mark analysis completed
            completed_time = datetime.now(timezone.utc)
            await analyses.update_one(
                {"_id": a_oid},
                {
                    "$set": {
                        "status": "completed",
                        "progress": 100,
                        "total_rows": summary["total_rows"],
                        "total_turbines": summary["total_turbines"],
                        "average_health": summary["average_health"],
                        "average_risk": summary["average_risk"],
                        "low_count": summary["low_count"],
                        "medium_count": summary["medium_count"],
                        "high_count": summary["high_count"],
                        "critical_count": summary["critical_count"],
                        "results_file": str(results_path),
                        "completed_at": completed_time,
                    }
                },
            )
            logger.info(f"Batch analysis {analysis_id} finished successfully.")

        except Exception as e:
            logger.error(f"Batch analysis {analysis_id} failed: {e}", exc_info=True)
            await analyses.update_one(
                {"_id": a_oid},
                {
                    "$set": {
                        "status": "failed",
                        "progress": 0,
                        "error": str(e),
                        "completed_at": datetime.now(timezone.utc),
                    }
                },
            )

    @classmethod
    async def get_status(cls, analysis_id: str, current_user: dict) -> AnalysisStatusResponse:
        """Check status and progress of batch inference job."""
        try:
            oid = ObjectId(analysis_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid analysis ID format.")

        analyses = get_analyses_collection()
        doc = await analyses.find_one({"_id": oid, "user_id": current_user["_id"]})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")

        return AnalysisStatusResponse(
            analysis_id=str(doc["_id"]),
            status=doc.get("status", "queued"),
            progress=int(doc.get("progress", 0)),
            total_rows=doc.get("total_rows", 0),
            started_at=doc.get("started_at"),
            completed_at=doc.get("completed_at"),
            error=doc.get("error"),
        )

    @classmethod
    async def get_results(cls, analysis_id: str, current_user: dict) -> AnalysisResultsResponse:
        """Fetch completed analysis results, summary metrics, and sample prediction records."""
        try:
            oid = ObjectId(analysis_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid analysis ID format.")

        analyses = get_analyses_collection()
        doc = await analyses.find_one({"_id": oid, "user_id": current_user["_id"]})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")

        if doc.get("status") != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Analysis is currently in '{doc.get('status')}' status. Results are only available when completed.",
            )

        predictions_col = get_predictions_collection()
        cursor = predictions_col.find({"analysis_id": oid}).limit(50)
        sample_preds = []
        async for p in cursor:
            sample_preds.append(PredictionRecord(
                id=str(p["_id"]),
                analysis_id=str(p["analysis_id"]),
                asset_id=p["asset_id"],
                timestamp=p["timestamp"].isoformat() if isinstance(p["timestamp"], datetime) else str(p["timestamp"]),
                actual_power=p["actual_power"],
                expected_power=p["expected_power"],
                residual=p["residual"],
                anomaly_score=p["anomaly_score"],
                health_index=p["health_index"],
                risk_score=p["risk_score"],
                risk_category=p["risk_category"],
                dominant_component=p["dominant_component"],
            ))

        alerts_col = get_alerts_collection()
        alerts_count = await alerts_col.count_documents({"analysis_id": oid})

        return AnalysisResultsResponse(
            analysis_id=str(doc["_id"]),
            dataset_id=str(doc["dataset_id"]),
            farm=doc["farm"],
            status=doc["status"],
            model_version=doc.get("model_version", "1.0.0"),
            total_rows=doc.get("total_rows", 0),
            total_turbines=doc.get("total_turbines", 0),
            average_health=doc.get("average_health", 0.0),
            average_risk=doc.get("average_risk", 0.0),
            low_count=doc.get("low_count", 0),
            medium_count=doc.get("medium_count", 0),
            high_count=doc.get("high_count", 0),
            critical_count=doc.get("critical_count", 0),
            started_at=doc["started_at"],
            completed_at=doc.get("completed_at"),
            sample_predictions=sample_preds,
            total_predictions=doc.get("total_rows", len(sample_preds)),
            alerts_generated=alerts_count,
        )
