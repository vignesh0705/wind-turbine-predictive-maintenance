from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from bson import ObjectId


def create_dataset_document(
    user_id: ObjectId,
    filename: str,
    original_filename: str,
    file_path: str,
    file_size: int = 0,
    rows: int = 0,
    columns: int = 0,
    status: str = "uploaded",
    compatible: bool = False,
    farm: Optional[str] = None,
    column_names: Optional[List[str]] = None,
    missing_features: Optional[List[str]] = None,
    available_features: Optional[List[str]] = None,
    detected_timestamp_col: Optional[str] = None,
    detected_asset_col: Optional[str] = None,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "user_id": user_id,
        "filename": filename,
        "original_filename": original_filename,
        "file_path": file_path,
        "file_size": file_size,
        "rows": rows,
        "columns": columns,
        "status": status,
        "compatible": compatible,
        "farm": farm,
        "column_names": column_names or [],
        "missing_features": missing_features or [],
        "available_features": available_features or [],
        "detected_timestamp_col": detected_timestamp_col,
        "detected_asset_col": detected_asset_col,
        "created_at": now,
        "updated_at": now,
    }
