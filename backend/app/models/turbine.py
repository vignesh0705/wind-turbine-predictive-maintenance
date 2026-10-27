from datetime import datetime, timezone
from typing import Optional, Dict, Any
from bson import ObjectId


def create_turbine_document(
    user_id: ObjectId,
    turbine_id: str,
    farm: str,
    name: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "user_id": user_id,
        "turbine_id": str(turbine_id),
        "farm": farm,
        "name": name or f"Turbine {turbine_id}",
        "latitude": latitude,
        "longitude": longitude,
        "created_at": now,
        "updated_at": now,
    }
