from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, status
from app.core.dependencies import get_current_user
from app.schemas.dataset import (
    DatasetResponse,
    DatasetSummaryResponse,
    DatasetQualityResponse,
    DatasetCompatibilityResponse,
)
from app.services.dataset_service import DatasetService

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.post("/upload", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a SCADA or general tabular CSV dataset.
    Validates file format, detects metadata, checks compatibility, and
    automatically triggers batch ML inference.
    """
    return await DatasetService.upload_dataset(
        file=file,
        current_user=current_user,
        background_tasks=background_tasks,
        auto_analyze=True,
    )


@router.get("", response_model=List[DatasetResponse])
@router.get("/", response_model=List[DatasetResponse], include_in_schema=False)
async def list_datasets(current_user: dict = Depends(get_current_user)):
    """Retrieve all datasets uploaded by the current user."""
    return await DatasetService.get_user_datasets(current_user)


@router.get("/{id}", response_model=DatasetResponse)
async def get_dataset(id: str, current_user: dict = Depends(get_current_user)):
    """Retrieve metadata of a specific dataset."""
    doc = await DatasetService.get_dataset_by_id(id, current_user)
    return DatasetResponse(
        id=str(doc["_id"]),
        filename=doc["filename"],
        original_filename=doc["original_filename"],
        file_size=doc.get("file_size", 0),
        rows=doc.get("rows", 0),
        columns=doc.get("columns", 0),
        status=doc.get("status", "ready"),
        compatible=doc.get("compatible", False),
        farm=doc.get("farm"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.get("/{id}/summary", response_model=DatasetSummaryResponse)
async def get_dataset_summary(id: str, current_user: dict = Depends(get_current_user)):
    """Explore dataset summary: rows, columns, dtypes, missing values, duplicates, and stats."""
    return await DatasetService.get_summary(id, current_user)


@router.get("/{id}/quality", response_model=DatasetQualityResponse)
async def get_dataset_quality(id: str, current_user: dict = Depends(get_current_user)):
    """Inspect data quality metrics including missingness and column completeness."""
    return await DatasetService.get_quality(id, current_user)


@router.get("/{id}/compatibility", response_model=DatasetCompatibilityResponse)
async def get_dataset_compatibility(id: str, current_user: dict = Depends(get_current_user)):
    """Check dataset feature compatibility against Wind Farm A and Farm B trained pipelines."""
    return await DatasetService.get_dataset_compatibility(id, current_user)
