from fastapi import APIRouter, Depends, Query
from app.core.dependencies import get_current_user
from app.services.explainability_service import ExplainabilityService

router = APIRouter(prefix="/explainability", tags=["Explainability"])


@router.get("/global")
def get_global_explainability(
    farm: str = Query("A", description="Wind Farm identifier ('A' or 'B')"),
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve global model explainability and feature importance.
    Uses precomputed SHAP assets when available on disk or native model feature importances.
    """
    return ExplainabilityService.get_global_explainability(farm=farm)


@router.get("/{asset_id}")
def get_local_explainability(
    asset_id: str,
    farm: str = Query("A", description="Wind Farm identifier ('A' or 'B')"),
    current_user: dict = Depends(get_current_user),
):
    """Retrieve local explainability plots/assets for a specific wind turbine asset."""
    return ExplainabilityService.get_local_explainability(asset_id=asset_id, farm=farm)
