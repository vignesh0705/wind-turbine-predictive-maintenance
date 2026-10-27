from datetime import datetime, timezone
from typing import Optional, Dict, Any
from bson import ObjectId


def create_prediction_document(
    analysis_id: ObjectId,
    asset_id: str,
    timestamp: datetime,
    actual_power: float,
    expected_power: float,
    residual: float,
    anomaly_score: float,
    health_index: float,
    risk_score: float,
    risk_category: str,
    dominant_component: str,
) -> Dict[str, Any]:
    return {
        "analysis_id": analysis_id,
        "asset_id": asset_id,
        "timestamp": timestamp,
        "actual_power": float(actual_power),
        "expected_power": float(expected_power),
        "residual": float(residual),
        "anomaly_score": float(anomaly_score),
        "health_index": float(health_index),
        "risk_score": float(risk_score),
        "risk_category": risk_category,
        "dominant_component": dominant_component,
    }
