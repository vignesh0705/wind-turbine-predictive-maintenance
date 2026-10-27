from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
async def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    """
    Retrieve fleet operational overview:
    Total turbines, average health, average risk, alert counts, power output,
    and latest analysis metrics.
    """
    return await DashboardService.get_summary(current_user)
