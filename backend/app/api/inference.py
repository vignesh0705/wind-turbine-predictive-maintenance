from fastapi import APIRouter, Depends, BackgroundTasks, status
from app.core.dependencies import get_current_user
from app.schemas.prediction import SingleInferenceRequest, SingleInferenceResponse
from app.schemas.analysis import (
    BatchInferenceRequest,
    BatchInferenceResponse,
    AnalysisStatusResponse,
    AnalysisResultsResponse,
)
from app.services.inference_service import InferenceService

router = APIRouter(prefix="/inference", tags=["Inference"])


@router.post("/single", response_model=SingleInferenceResponse)
async def single_inference(
    req: SingleInferenceRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Run instant edge ML inference on a single SCADA feature sample.
    Calculates expected power, residual, autoencoder anomaly, isolation forest score,
    and fuses them into operational health and risk priority metrics.
    """
    return InferenceService.run_single(req)


@router.post("/batch", response_model=BatchInferenceResponse, status_code=status.HTTP_202_ACCEPTED)
async def batch_inference(
    req: BatchInferenceRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Queue asynchronous batch inference over a compatible uploaded SCADA dataset.
    Returns analysis_id immediately for progress polling.
    """
    return await InferenceService.queue_batch(req, current_user, background_tasks)


@router.get("/{analysis_id}/status", response_model=AnalysisStatusResponse)
async def get_analysis_status(
    analysis_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Poll processing status and progress for a queued batch inference analysis."""
    return await InferenceService.get_status(analysis_id, current_user)


@router.get("/{analysis_id}/results", response_model=AnalysisResultsResponse)
async def get_analysis_results(
    analysis_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Retrieve summarized fleet metrics, risk distributions, and sample predictions from completed analysis."""
    return await InferenceService.get_results(analysis_id, current_user)
