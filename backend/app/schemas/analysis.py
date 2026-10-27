from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.prediction import PredictionRecord


class BatchInferenceRequest(BaseModel):
    dataset_id: str = Field(..., description="ID of previously uploaded dataset")
    farm: Optional[str] = Field(None, description="Optional override farm identifier ('A' or 'B')")


class BatchInferenceResponse(BaseModel):
    analysis_id: str
    status: str = "queued"
    message: str = "Analysis queued successfully"


class AnalysisStatusResponse(BaseModel):
    analysis_id: str
    status: str
    progress: int = 0
    total_rows: Optional[int] = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class AnalysisResultsResponse(BaseModel):
    analysis_id: str
    dataset_id: str
    farm: str
    status: str
    model_version: str
    total_rows: int
    total_turbines: int
    average_health: float
    average_risk: float
    low_count: int
    medium_count: int
    high_count: int
    critical_count: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    sample_predictions: List[PredictionRecord] = Field(default_factory=list)
    total_predictions: int = 0
    alerts_generated: int = 0
