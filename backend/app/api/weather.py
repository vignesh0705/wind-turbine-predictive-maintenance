from fastapi import APIRouter, Depends, Query
from app.core.dependencies import get_current_user
from app.schemas.weather import CurrentWeatherResponse
from app.services.weather_service import WeatherService

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("/current", response_model=CurrentWeatherResponse)
async def get_current_weather(
    latitude: float = Query(54.5, description="Wind farm latitude"),
    longitude: float = Query(9.5, description="Wind farm longitude"),
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch current site weather conditions for frontend situational awareness.
    This meteorological data is strictly segregated from the SCADA ML inference models.
    """
    return await WeatherService.get_current_weather(latitude=latitude, longitude=longitude)
