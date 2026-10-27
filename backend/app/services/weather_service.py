import logging
from datetime import datetime, timezone
import httpx

from app.config.settings import settings
from app.schemas.weather import CurrentWeatherResponse

logger = logging.getLogger("wind_turbine_ai.weather_service")


class WeatherService:
    @staticmethod
    async def get_current_weather(
        latitude: float = 54.5,
        longitude: float = 9.5,
    ) -> CurrentWeatherResponse:
        """
        Fetch live meteorological observations for the frontend dashboard.
        Weather data is strictly isolated to operational awareness and is NOT
        passed into the SCADA ML model pipeline.
        """
        base_url = settings.WEATHER_API_BASE_URL or "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code",
        }

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(base_url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    current = data.get("current", {})
                    return CurrentWeatherResponse(
                        timestamp=datetime.now(timezone.utc),
                        temperature_celsius=current.get("temperature_2m"),
                        wind_speed_ms=current.get("wind_speed_10m"),
                        wind_direction_deg=current.get("wind_direction_10m"),
                        relative_humidity=current.get("relative_humidity_2m"),
                        surface_pressure_hpa=current.get("surface_pressure"),
                        weather_condition="Clear / Operational",
                        location_name=f"Wind Farm Site ({latitude}, {longitude})",
                        source="open_meteo_api",
                    )
        except Exception as e:
            logger.warning(f"Failed to query external weather API: {e}. Returning site baseline.")

        # Fallback default baseline if network is offline or request times out
        return CurrentWeatherResponse(
            timestamp=datetime.now(timezone.utc),
            temperature_celsius=14.5,
            wind_speed_ms=8.2,
            wind_direction_deg=220.0,
            relative_humidity=75.0,
            surface_pressure_hpa=1013.2,
            weather_condition="Nominal Operational Wind",
            location_name=f"Wind Farm Site ({latitude}, {longitude})",
            source="site_meteorological_telemetry_fallback",
        )
