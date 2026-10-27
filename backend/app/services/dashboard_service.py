import logging
from typing import Dict, Any, List
from datetime import datetime
from bson import ObjectId

from app.database.mongodb import (
    get_turbines_collection,
    get_analyses_collection,
    get_alerts_collection,
    get_predictions_collection,
)

logger = logging.getLogger("wind_turbine_ai.dashboard_service")


class DashboardService:
    @staticmethod
    async def get_summary(current_user: dict) -> Dict[str, Any]:
        """Aggregate high-level fleet operational status for the authenticated user."""
        u_id = current_user["_id"]

        turbines_col = get_turbines_collection()
        analyses_col = get_analyses_collection()
        alerts_col = get_alerts_collection()
        predictions_col = get_predictions_collection()

        # 1. Turbines count & aggregate health
        turbines = await turbines_col.find({"user_id": u_id}).to_list(length=1000)
        if len(turbines) == 0:
            try:
                from app.scripts.seed_fleet import seed_fleet_for_user
                seed_fleet_for_user(u_id)
                turbines = await turbines_col.find({"user_id": u_id}).to_list(length=1000)
            except Exception as e:
                logger.warning(f"Auto-seed fleet in dashboard: {e}")

        total_turbines = len(turbines)

        health_vals = [t["latest_health"] for t in turbines if t.get("latest_health") is not None]
        risk_vals = [t["latest_risk"] for t in turbines if t.get("latest_risk") is not None]

        avg_health = round(sum(health_vals) / len(health_vals), 2) if health_vals else 100.0
        avg_risk = round(sum(risk_vals) / len(risk_vals), 2) if risk_vals else 0.0

        low_count = sum(1 for r in risk_vals if r < 25)
        medium_count = sum(1 for r in risk_vals if 25 <= r < 50)
        high_count = sum(1 for r in risk_vals if 50 <= r < 75)
        critical_count = sum(1 for r in risk_vals if r >= 75)

        # 2. Latest completed analysis
        latest_analysis_doc = await analyses_col.find_one(
            {"user_id": u_id, "status": "completed"},
            sort=[("completed_at", -1)]
        )

        # Fallback 1: If no analysis completed, check if user has uploaded a dataset and auto-process it
        if not latest_analysis_doc:
            from app.database.mongodb import get_datasets_collection
            datasets_col = get_datasets_collection()
            user_ds = await datasets_col.find_one({"user_id": u_id, "compatible": True}, sort=[("created_at", -1)])
            if user_ds:
                try:
                    from app.models.analysis import create_analysis_document
                    from app.services.inference_service import InferenceService
                    farm_to_run = user_ds.get("farm") or "A"
                    a_doc = create_analysis_document(
                        user_id=u_id,
                        dataset_id=user_ds["_id"],
                        farm=farm_to_run,
                        status="queued",
                    )
                    a_res = await analyses_col.insert_one(a_doc)
                    a_id = str(a_res.inserted_id)
                    await InferenceService._process_batch_task(
                        analysis_id=a_id,
                        dataset_file_path=user_ds["file_path"],
                        farm=farm_to_run,
                        user_id=str(u_id),
                        asset_col=user_ds.get("detected_asset_col"),
                        time_col=user_ds.get("detected_timestamp_col"),
                    )
                    latest_analysis_doc = await analyses_col.find_one({"_id": a_res.inserted_id})
                except Exception as e:
                    logger.warning(f"Auto-process user dataset for dashboard summary: {e}")

        # Fallback 2: If still no analysis, auto-seed fleet baseline from 0.csv
        if not latest_analysis_doc:
            try:
                from pathlib import Path
                from app.models.analysis import create_analysis_document
                from app.services.inference_service import InferenceService
                sample_file = Path("storage/Wind Farm A/datasets/0.csv")
                if sample_file.exists():
                    a_doc = create_analysis_document(
                        user_id=u_id,
                        dataset_id=ObjectId(),
                        farm="A",
                        status="queued",
                    )
                    a_res = await analyses_col.insert_one(a_doc)
                    a_id = str(a_res.inserted_id)
                    await InferenceService._process_batch_task(
                        analysis_id=a_id,
                        dataset_file_path=str(sample_file),
                        farm="A",
                        user_id=str(u_id),
                        asset_col="asset_id",
                        time_col="time_stamp",
                    )
                    latest_analysis_doc = await analyses_col.find_one({"_id": a_res.inserted_id})
            except Exception as e:
                logger.warning(f"Auto-seed baseline analysis: {e}")

        latest_analysis = None
        if latest_analysis_doc:
            latest_analysis = {
                "id": str(latest_analysis_doc["_id"]),
                "farm": latest_analysis_doc.get("farm"),
                "total_rows": latest_analysis_doc.get("total_rows", 0),
                "total_turbines": latest_analysis_doc.get("total_turbines", 0),
                "average_health": latest_analysis_doc.get("average_health", 0.0),
                "average_risk": latest_analysis_doc.get("average_risk", 0.0),
                "completed_at": latest_analysis_doc.get("completed_at"),
            }

        # 3. Active (unacknowledged) alerts
        # Find analysis ids belonging to user
        user_analyses = await analyses_col.find({"user_id": u_id}, {"_id": 1}).to_list(length=500)
        user_analysis_ids = [a["_id"] for a in user_analyses]

        active_alerts_count = 0
        recent_alerts = []
        if user_analysis_ids:
            active_alerts_count = await alerts_col.count_documents({
                "analysis_id": {"$in": user_analysis_ids},
                "acknowledged": False,
            })
            cursor = alerts_col.find({"analysis_id": {"$in": user_analysis_ids}}).sort("created_at", -1).limit(10)
            async for doc in cursor:
                recent_alerts.append({
                    "id": str(doc["_id"]),
                    "analysis_id": str(doc["analysis_id"]),
                    "asset_id": doc["asset_id"],
                    "timestamp": doc["timestamp"],
                    "severity": doc["severity"],
                    "risk_score": doc["risk_score"],
                    "component": doc["component"],
                    "anomaly_score": doc["anomaly_score"],
                    "message": doc["message"],
                    "acknowledged": doc["acknowledged"],
                    "created_at": doc["created_at"],
                })

        # 4. Power generation summary and time-series history from latest predictions
        actual_power = 0.0
        expected_power = 0.0
        power_history = []
        if latest_analysis_doc:
            # Query recent predictions and reverse to chronological order
            pred_cursor = predictions_col.find(
                {"analysis_id": latest_analysis_doc["_id"]}
            ).sort("timestamp", -1).limit(40)
            raw_preds = await pred_cursor.to_list(length=40)
            raw_preds.reverse()

            p_actuals, p_expecteds = [], []
            for p in raw_preds:
                act = round(float(p.get("actual_power", 0.0)), 3)
                exp = round(float(p.get("expected_power", 0.0)), 3)
                res = round(float(p.get("residual", act - exp)), 3)
                p_actuals.append(act)
                p_expecteds.append(exp)

                ts_val = p.get("timestamp")
                if isinstance(ts_val, datetime):
                    time_str = ts_val.strftime("%H:%M")
                elif ts_val:
                    ts_str = str(ts_val)
                    time_str = ts_str.split("T")[-1][:5] if "T" in ts_str else (ts_str.split(" ")[-1][:5] if " " in ts_str else ts_str[-5:])
                else:
                    time_str = f"T+{len(power_history)}"

                power_history.append({
                    "timestamp": time_str,
                    "actual_power": act,
                    "expected_power": exp,
                    "residual": res,
                })

            if p_actuals:
                actual_power = round(p_actuals[-1], 3)
                expected_power = round(p_expecteds[-1], 3)

        return {
            "total_turbines": total_turbines,
            "average_health": avg_health,
            "average_risk": avg_risk,
            "active_alerts": active_alerts_count,
            "low_count": low_count,
            "medium_count": medium_count,
            "high_count": high_count,
            "critical_count": critical_count,
            "actual_power": actual_power,
            "expected_power": expected_power,
            "power_history": power_history,
            "latest_analysis": latest_analysis,
            "recent_alerts": recent_alerts,
        }
