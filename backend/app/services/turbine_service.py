import logging
from typing import List, Dict, Any
from bson import ObjectId
from fastapi import HTTPException, status

from app.database.mongodb import get_turbines_collection, get_predictions_collection, get_analyses_collection
from app.schemas.turbine import TurbineResponse, TurbineDetailResponse, TurbineHistoryResponse
from app.schemas.prediction import PredictionRecord

logger = logging.getLogger("wind_turbine_ai.turbine_service")


class TurbineService:
    @staticmethod
    async def get_all_turbines(current_user: dict) -> List[TurbineResponse]:
        """Fetch list of all turbines registered for user."""
        turbines_col = get_turbines_collection()
        count = await turbines_col.count_documents({"user_id": current_user["_id"]})
        if count == 0:
            try:
                from app.scripts.seed_fleet import seed_fleet_for_user
                seed_fleet_for_user(current_user["_id"])
            except Exception as e:
                logger.warning(f"Auto-seed fleet: {e}")

        cursor = turbines_col.find({"user_id": current_user["_id"]}).sort("turbine_id", 1)

        result = []
        async for doc in cursor:
            result.append(TurbineResponse(
                id=str(doc["_id"]),
                turbine_id=doc["turbine_id"],
                farm=doc.get("farm", "Unknown"),
                name=doc.get("name", f"Turbine {doc['turbine_id']}"),
                latitude=doc.get("latitude"),
                longitude=doc.get("longitude"),
                latest_health=doc.get("latest_health"),
                latest_risk=doc.get("latest_risk"),
                latest_risk_category=doc.get("latest_risk_category"),
                dominant_component=doc.get("dominant_component"),
                latest_prediction_timestamp=doc.get("latest_prediction_timestamp"),
            ))
        return result

    @staticmethod
    async def get_turbine_detail(turbine_id_or_oid: str, current_user: dict) -> TurbineDetailResponse:
        """Fetch individual turbine details by turbine_id or MongoDB _id."""
        turbines_col = get_turbines_collection()
        u_id = current_user["_id"]

        query = {"user_id": u_id, "$or": [{"turbine_id": turbine_id_or_oid}]}
        if ObjectId.is_valid(turbine_id_or_oid):
            query["$or"].append({"_id": ObjectId(turbine_id_or_oid)})

        doc = await turbines_col.find_one(query)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Turbine '{turbine_id_or_oid}' not found.")

        return TurbineDetailResponse(
            id=str(doc["_id"]),
            turbine_id=doc["turbine_id"],
            farm=doc.get("farm", "Unknown"),
            name=doc.get("name", f"Turbine {doc['turbine_id']}"),
            latitude=doc.get("latitude"),
            longitude=doc.get("longitude"),
            latest_health=doc.get("latest_health"),
            latest_risk=doc.get("latest_risk"),
            latest_risk_category=doc.get("latest_risk_category"),
            dominant_component=doc.get("dominant_component"),
            latest_prediction_timestamp=doc.get("latest_prediction_timestamp"),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        )

    @staticmethod
    async def get_turbine_history(turbine_id_or_oid: str, current_user: dict, limit: int = 100) -> TurbineHistoryResponse:
        """Fetch historical diagnostic prediction records for a specific turbine."""
        turbines_col = get_turbines_collection()
        u_id = current_user["_id"]

        query = {"user_id": u_id, "$or": [{"turbine_id": turbine_id_or_oid}]}
        if ObjectId.is_valid(turbine_id_or_oid):
            query["$or"].append({"_id": ObjectId(turbine_id_or_oid)})

        doc = await turbines_col.find_one(query)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Turbine '{turbine_id_or_oid}' not found.")

        turb_id = doc["turbine_id"]
        farm = doc.get("farm", "Unknown")

        # Get all analysis ids for current user
        analyses_col = get_analyses_collection()
        user_analyses = await analyses_col.find({"user_id": u_id}, {"_id": 1}).to_list(length=500)
        a_ids = [a["_id"] for a in user_analyses]

        predictions_col = get_predictions_collection()
        cursor = predictions_col.find({
            "analysis_id": {"$in": a_ids},
            "asset_id": turb_id,
        }).sort("timestamp", -1).limit(limit)

        records = []
        async for p in cursor:
            records.append(PredictionRecord(
                id=str(p["_id"]),
                analysis_id=str(p["analysis_id"]),
                asset_id=p["asset_id"],
                timestamp=p["timestamp"].isoformat() if hasattr(p["timestamp"], "isoformat") else str(p["timestamp"]),
                actual_power=p["actual_power"],
                expected_power=p["expected_power"],
                residual=p["residual"],
                anomaly_score=p["anomaly_score"],
                health_index=p["health_index"],
                risk_score=p["risk_score"],
                risk_category=p["risk_category"],
                dominant_component=p["dominant_component"],
            ))

        return TurbineHistoryResponse(
            turbine_id=turb_id,
            farm=farm,
            total_records=len(records),
            history=records,
        )
