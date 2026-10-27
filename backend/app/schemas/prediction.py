from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class SingleInferenceRequest(BaseModel):
    farm: Optional[str] = Field(None, description="Farm identifier: 'A' or 'B' (or 'Wind Farm A' / 'Wind Farm B')")
    asset_id: Optional[str] = Field("WTG_01", description="Turbine/Asset identifier")
    timestamp: Optional[str] = Field(None, description="ISO timestamp string")
    actual_power: Optional[float] = Field(None, description="Actual measured power (if available)")
    features: Dict[str, float] = Field(..., description="Dictionary of feature name to numerical value")


class SingleInferenceResponse(BaseModel):
    farm: str
    asset_id: str
    timestamp: str
    actual_power: float
    expected_power: float
    residual: float
    anomaly_score: float
    health_index: float
    risk_score: float
    risk_category: str
    dominant_component: str
    components: Dict[str, float] = Field(default_factory=dict)
    explanation: Dict[str, Any] = Field(default_factory=dict)


class PredictionRecord(BaseModel):
    id: Optional[str] = None
    analysis_id: str
    asset_id: str
    timestamp: str
    actual_power: float
    expected_power: float
    residual: float
    anomaly_score: float
    health_index: float
    risk_score: float
    risk_category: str
    dominant_component: str
