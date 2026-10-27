from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class AlertResponse(BaseModel):
    id: str
    analysis_id: str
    asset_id: str
    timestamp: datetime
    severity: str
    risk_score: float
    component: str
    anomaly_score: float
    message: str
    acknowledged: bool
    created_at: datetime


class AlertListResponse(BaseModel):
    items: List[AlertResponse]
    total: int


class AlertAcknowledgeResponse(BaseModel):
    id: str
    acknowledged: bool
    message: str
