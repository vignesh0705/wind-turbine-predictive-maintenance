from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.core.dependencies import get_current_user
from app.schemas.alert import AlertResponse, AlertListResponse, AlertAcknowledgeResponse
from app.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=AlertListResponse)
@router.get("/", response_model=AlertListResponse, include_in_schema=False)
async def list_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity: LOW, MEDIUM, HIGH, CRITICAL"),
    asset_id: Optional[str] = Query(None, description="Filter by turbine asset ID"),
    analysis_id: Optional[str] = Query(None, description="Filter by analysis ID"),
    acknowledged: Optional[bool] = Query(None, description="Filter by acknowledgment status"),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """Retrieve operational alerts derived from model risk calculations."""
    return await AlertService.get_alerts(
        current_user=current_user,
        severity=severity,
        asset_id=asset_id,
        analysis_id=analysis_id,
        acknowledged=acknowledged,
        limit=limit,
        skip=skip,
    )


@router.get("/{id}", response_model=AlertResponse)
async def get_alert(id: str, current_user: dict = Depends(get_current_user)):
    """Retrieve details of a specific alert."""
    return await AlertService.get_alert_by_id(id, current_user)


@router.post("/{id}/acknowledge", response_model=AlertAcknowledgeResponse)
async def acknowledge_alert(id: str, current_user: dict = Depends(get_current_user)):
    """Mark an operational alert as acknowledged by an operator."""
    return await AlertService.acknowledge_alert(id, current_user)
