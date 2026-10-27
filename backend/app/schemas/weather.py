from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CurrentWeatherResponse(BaseModel):
    timestamp: datetime
    temperature_celsius: Optional[float] = None
    wind_speed_ms: Optional[float] = None
    wind_direction_deg: Optional[float] = None
    relative_humidity: Optional[float] = None
    surface_pressure_hpa: Optional[float] = None
    weather_condition: Optional[str] = "Normal"
    location_name: Optional[str] = "Wind Farm Site"
    source: str = "external_weather_api"
