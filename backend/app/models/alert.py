from datetime import datetime, timezone
from typing import Optional, Dict, Any
from bson import ObjectId


def create_alert_document(
    analysis_id: ObjectId,
    asset_id: str,
    timestamp: datetime,
    severity: str,
    risk_score: float,
    component: str,
    anomaly_score: float,
    message: str,
    acknowledged: bool = False,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "analysis_id": analysis_id,
        "asset_id": asset_id,
        "timestamp": timestamp,
        "severity": severity,
        "risk_score": float(risk_score),
        "component": component,
        "anomaly_score": float(anomaly_score),
        "message": message,
        "acknowledged": acknowledged,
        "created_at": now,
    }
