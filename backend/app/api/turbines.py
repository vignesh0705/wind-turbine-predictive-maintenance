from typing import List
from fastapi import APIRouter, Depends, Query
from app.core.dependencies import get_current_user
from app.schemas.turbine import TurbineResponse, TurbineDetailResponse, TurbineHistoryResponse
from app.services.turbine_service import TurbineService

router = APIRouter(prefix="/turbines", tags=["Turbines"])


@router.get("", response_model=List[TurbineResponse])
@router.get("/", response_model=List[TurbineResponse], include_in_schema=False)
async def list_turbines(current_user: dict = Depends(get_current_user)):
    """List all wind turbines registered in the user's fleet with latest diagnostic indicators."""
    return await TurbineService.get_all_turbines(current_user)


@router.get("/{id}", response_model=TurbineDetailResponse)
async def get_turbine(id: str, current_user: dict = Depends(get_current_user)):
    """Retrieve detailed state and metadata for a specific wind turbine."""
    return await TurbineService.get_turbine_detail(id, current_user)


@router.get("/{id}/history", response_model=TurbineHistoryResponse)
async def get_turbine_history(
    id: str,
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_user),
):
    """Retrieve historical prediction and diagnostic time-series records for a turbine."""
    return await TurbineService.get_turbine_history(id, current_user, limit=limit)
