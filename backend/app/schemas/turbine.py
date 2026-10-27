from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.prediction import PredictionRecord


class TurbineResponse(BaseModel):
    id: str
    turbine_id: str
    farm: str
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    latest_health: Optional[float] = None
    latest_risk: Optional[float] = None
    latest_risk_category: Optional[str] = None
    dominant_component: Optional[str] = None
    latest_prediction_timestamp: Optional[datetime] = None


class TurbineDetailResponse(TurbineResponse):
    created_at: datetime
    updated_at: datetime


class TurbineHistoryResponse(BaseModel):
    turbine_id: str
    farm: str
    total_records: int
    history: List[PredictionRecord]
