from datetime import datetime, timezone
from typing import Optional, Dict, Any
from bson import ObjectId


def create_analysis_document(
    user_id: ObjectId,
    dataset_id: ObjectId,
    farm: str,
    status: str = "queued",
    model_version: str = "1.0.0",
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "user_id": user_id,
        "dataset_id": dataset_id,
        "farm": farm,
        "status": status,
        "model_version": model_version,
        "total_rows": 0,
        "total_turbines": 0,
        "average_health": 0.0,
        "average_risk": 0.0,
        "low_count": 0,
        "medium_count": 0,
        "high_count": 0,
        "critical_count": 0,
        "progress": 0,
        "results_file": None,
        "started_at": now,
        "completed_at": None,
        "created_at": now,
    }
