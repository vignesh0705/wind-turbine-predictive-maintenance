import logging
from typing import List, Optional, Dict, Any
from bson import ObjectId
from fastapi import HTTPException, status

from app.database.mongodb import get_alerts_collection, get_analyses_collection
from app.schemas.alert import AlertResponse, AlertListResponse, AlertAcknowledgeResponse

logger = logging.getLogger("wind_turbine_ai.alert_service")


class AlertService:
    @staticmethod
    async def get_alerts(
        current_user: dict,
        severity: Optional[str] = None,
        asset_id: Optional[str] = None,
        analysis_id: Optional[str] = None,
        acknowledged: Optional[bool] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> AlertListResponse:
        """Fetch filtered operational alerts belonging to the user's analyses."""
        u_id = current_user["_id"]
        analyses_col = get_analyses_collection()
        alerts_col = get_alerts_collection()

        # Secure filter: Only retrieve alerts from user's analyses
        if analysis_id:
            if not ObjectId.is_valid(analysis_id):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid analysis ID.")
            # Verify ownership
            owned = await analyses_col.find_one({"_id": ObjectId(analysis_id), "user_id": u_id})
            if not owned:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found or access denied.")
            query: Dict[str, Any] = {"analysis_id": ObjectId(analysis_id)}
        else:
            user_analyses = await analyses_col.find({"user_id": u_id}, {"_id": 1}).to_list(length=1000)
            user_analysis_ids = [a["_id"] for a in user_analyses]
            query = {"analysis_id": {"$in": user_analysis_ids}}

        if severity:
            query["severity"] = severity.upper()
        if asset_id:
            query["asset_id"] = asset_id
        if acknowledged is not None:
            query["acknowledged"] = acknowledged

        total = await alerts_col.count_documents(query)
        cursor = alerts_col.find(query).sort("created_at", -1).skip(skip).limit(limit)

        items = []
        async for doc in cursor:
            items.append(AlertResponse(
                id=str(doc["_id"]),
                analysis_id=str(doc["analysis_id"]),
                asset_id=doc["asset_id"],
                timestamp=doc["timestamp"],
                severity=doc["severity"],
                risk_score=doc["risk_score"],
                component=doc["component"],
                anomaly_score=doc["anomaly_score"],
                message=doc["message"],
                acknowledged=doc.get("acknowledged", False),
                created_at=doc["created_at"],
            ))

        return AlertListResponse(items=items, total=total)

    @staticmethod
    async def get_alert_by_id(alert_id: str, current_user: dict) -> AlertResponse:
        """Fetch alert detail ensuring ownership via parent analysis."""
        if not ObjectId.is_valid(alert_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid alert ID.")

        alerts_col = get_alerts_collection()
        analyses_col = get_analyses_collection()

        doc = await alerts_col.find_one({"_id": ObjectId(alert_id)})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")

        # Check analysis ownership
        analysis = await analyses_col.find_one({"_id": doc["analysis_id"], "user_id": current_user["_id"]})
        if not analysis:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this alert.")

        return AlertResponse(
            id=str(doc["_id"]),
            analysis_id=str(doc["analysis_id"]),
            asset_id=doc["asset_id"],
            timestamp=doc["timestamp"],
            severity=doc["severity"],
            risk_score=doc["risk_score"],
            component=doc["component"],
            anomaly_score=doc["anomaly_score"],
            message=doc["message"],
            acknowledged=doc.get("acknowledged", False),
            created_at=doc["created_at"],
        )

    @staticmethod
    async def acknowledge_alert(alert_id: str, current_user: dict) -> AlertAcknowledgeResponse:
        """Mark an alert as acknowledged."""
        if not ObjectId.is_valid(alert_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid alert ID.")

        alerts_col = get_alerts_collection()
        analyses_col = get_analyses_collection()

        doc = await alerts_col.find_one({"_id": ObjectId(alert_id)})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")

        analysis = await analyses_col.find_one({"_id": doc["analysis_id"], "user_id": current_user["_id"]})
        if not analysis:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        await alerts_col.update_one({"_id": ObjectId(alert_id)}, {"$set": {"acknowledged": True}})

        return AlertAcknowledgeResponse(
            id=alert_id,
            acknowledged=True,
            message="Alert marked as acknowledged.",
        )
