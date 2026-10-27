from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DatasetResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    rows: int
    columns: int
    status: str
    compatible: bool
    farm: Optional[str] = None
    analysis_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DatasetSummaryResponse(BaseModel):
    id: str
    rows: int
    columns: int
    column_names: List[str]
    dtypes: Dict[str, str]
    missing_values: Dict[str, int]
    duplicate_count: int
    numerical_statistics: Dict[str, Dict[str, Optional[float]]]
    detected_timestamp_col: Optional[str] = None
    detected_asset_col: Optional[str] = None


class DatasetQualityResponse(BaseModel):
    id: str
    total_cells: int
    missing_cells: int
    missing_percentage: float
    duplicate_rows: int
    duplicate_percentage: float
    column_completeness: Dict[str, float]


class DatasetCompatibilityResponse(BaseModel):
    compatible: bool
    farm: Optional[str] = None
    missing_features: List[str] = Field(default_factory=list)
    available_features: List[str] = Field(default_factory=list)
    message: Optional[str] = None
