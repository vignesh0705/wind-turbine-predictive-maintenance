import os
import uuid
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from bson import ObjectId
import pandas as pd
import numpy as np
from fastapi import HTTPException, UploadFile, status, BackgroundTasks

from app.config.paths import UPLOAD_DIR
from app.config.settings import settings
from app.database.mongodb import get_datasets_collection
from app.ml.model_manager import model_manager
from app.models.dataset import create_dataset_document
from app.schemas.dataset import (
    DatasetResponse,
    DatasetSummaryResponse,
    DatasetQualityResponse,
    DatasetCompatibilityResponse,
)

logger = logging.getLogger("wind_turbine_ai.dataset_service")


class DatasetService:
    @staticmethod
    def _read_csv(file_path: Path, nrows: Optional[int] = None) -> pd.DataFrame:
        """Read CSV auto-detecting semicolon or comma delimiter."""
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                first_line = f.readline()
            sep = ";" if ";" in first_line else ","
            return pd.read_csv(file_path, sep=sep, nrows=nrows)
        except Exception:
            return pd.read_csv(file_path, nrows=nrows)

    @staticmethod
    def _detect_columns(columns: List[str]) -> Tuple[Optional[str], Optional[str]]:
        """Detect potential timestamp and asset columns based on standard naming."""
        time_candidates = ["time_stamp", "timestamp", "datetime", "date_time", "time", "date", "recorded_at", "timestamp_utc"]
        asset_candidates = ["turbine_id", "asset_id", "turbine", "asset", "unit", "wtg_id"]

        detected_time = None
        for col in columns:
            if col.lower().strip() in time_candidates:
                detected_time = col
                break

        detected_asset = None
        for col in columns:
            if col.lower().strip() in asset_candidates:
                detected_asset = col
                break

        return detected_time, detected_asset

    @classmethod
    def check_compatibility(cls, columns: List[str]) -> DatasetCompatibilityResponse:
        """
        Check uploaded dataset columns against actual trained model feature configurations
        for Farm A and Farm B from feature_config.json.
        """
        feature_cfg = model_manager.get_feature_config()
        farms = feature_cfg.get("farms", {})

        # Check Farm A
        fa_cfg = farms.get("Wind Farm A", {})
        fa_perf = set(fa_cfg.get("perf_features", []))
        fa_anom = set(fa_cfg.get("anomaly_features", []))
        fa_required = fa_perf.union(fa_anom)

        # Check Farm B
        fb_cfg = farms.get("Wind Farm B", {})
        fb_perf = set(fb_cfg.get("perf_features", []))
        fb_anom = set(fb_cfg.get("anomaly_features", []))
        fb_required = fb_perf.union(fb_anom)

        col_set = set(columns)

        missing_a = sorted(list(fa_required - col_set))
        missing_b = sorted(list(fb_required - col_set))

        from app.ml.feature_engineering import is_farm_a_raw_scada, is_farm_b_raw_scada

        # Check if compatible with Farm A (raw SCADA or engineered features)
        if is_farm_a_raw_scada(columns) or len(missing_a) == 0:
            return DatasetCompatibilityResponse(
                compatible=True,
                farm="A",
                missing_features=[],
                available_features=sorted(list(col_set)),
                message="Dataset is fully compatible with Wind Farm A model pipeline (SCADA telemetry supported).",
            )

        # Check if compatible with Farm B (raw SCADA or engineered features)
        if is_farm_b_raw_scada(columns) or len(missing_b) == 0:
            return DatasetCompatibilityResponse(
                compatible=True,
                farm="B",
                missing_features=[],
                available_features=sorted(list(col_set)),
                message="Dataset is fully compatible with Wind Farm B model pipeline (SCADA telemetry supported).",
            )

        # Incompatible scenario: determine closest match for helpful feedback
        closest_farm = "A" if len(missing_a) <= len(missing_b) else "B"
        missing_selected = missing_a if closest_farm == "A" else missing_b
        avail_selected = sorted(list(col_set.intersection(fa_required if closest_farm == "A" else fb_required)))

        return DatasetCompatibilityResponse(
            compatible=False,
            farm=None,
            missing_features=missing_selected,
            available_features=avail_selected,
            message="Dataset is not compatible with the trained wind turbine model. "
                    f"Closest match is Farm {closest_farm} (missing {len(missing_selected)} features).",
        )

    @classmethod
    async def upload_dataset(
        cls,
        file: UploadFile,
        current_user: dict,
        background_tasks: Optional[BackgroundTasks] = None,
        auto_analyze: bool = True,
    ) -> DatasetResponse:
        """
        Validate, save, inspect, and register an uploaded CSV dataset.
        Prevents path traversal, enforces size limits, and checks compatibility.
        """
        # Validate filename and extension
        original_name = file.filename or "dataset.csv"
        ext = Path(original_name).suffix.lower()
        if ext != ".csv":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{ext}'. Only standard CSV (.csv) files are permitted.",
            )

        # Safe unique storage filename
        safe_filename = f"{uuid.uuid4().hex}.csv"
        file_path = UPLOAD_DIR / safe_filename

        # Ensure directory exists
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        # Stream file to disk while enforcing size limit
        file_size = 0
        chunk_size = 1024 * 1024  # 1MB
        try:
            with open(file_path, "wb") as buffer:
                while True:
                    chunk = await file.read(chunk_size)
                    if not chunk:
                        break
                    file_size += len(chunk)
                    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
                        # Clean up partial file
                        buffer.close()
                        if file_path.exists():
                            file_path.unlink()
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File exceeds maximum allowed upload size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB.",
                        )
                    buffer.write(chunk)
        except HTTPException:
            raise
        except Exception as e:
            if file_path.exists():
                file_path.unlink()
            logger.error(f"Error writing uploaded file: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save uploaded file.")

        # Read CSV with pandas to inspect metadata
        try:
            # Read first chunk or entire file depending on size
            df = cls._read_csv(file_path, nrows=50000)
            rows = len(df)
            columns = list(df.columns)
            n_cols = len(columns)
        except Exception as e:
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse CSV file: {str(e)}",
            )

        detected_time, detected_asset = cls._detect_columns(columns)
        compat = cls.check_compatibility(columns)

        # Store in MongoDB
        doc = create_dataset_document(
            user_id=current_user["_id"],
            filename=safe_filename,
            original_filename=original_name,
            file_path=str(file_path),
            file_size=file_size,
            rows=rows,
            columns=n_cols,
            status="ready",
            compatible=compat.compatible,
            farm=compat.farm,
            column_names=columns,
            missing_features=compat.missing_features,
            available_features=compat.available_features,
            detected_timestamp_col=detected_time,
            detected_asset_col=detected_asset,
        )

        datasets = get_datasets_collection()
        result = await datasets.insert_one(doc)

        logger.info(f"Dataset uploaded successfully: {original_name} -> {safe_filename} (id: {result.inserted_id})")

        # Auto-trigger batch ML inference so output prediction curves are generated immediately
        analysis_id = None
        if auto_analyze and compat.compatible and background_tasks is not None:
            try:
                from app.models.analysis import create_analysis_document
                from app.services.inference_service import InferenceService
                from app.database.mongodb import get_analyses_collection

                analyses = get_analyses_collection()
                farm_to_run = compat.farm or "A"
                analysis_doc = create_analysis_document(
                    user_id=current_user["_id"],
                    dataset_id=result.inserted_id,
                    farm=farm_to_run,
                    status="queued",
                )
                a_res = await analyses.insert_one(analysis_doc)
                analysis_id = str(a_res.inserted_id)

                background_tasks.add_task(
                    InferenceService._process_batch_task,
                    analysis_id=analysis_id,
                    dataset_file_path=str(file_path),
                    farm=farm_to_run,
                    user_id=str(current_user["_id"]),
                    asset_col=detected_asset,
                    time_col=detected_time,
                )
                logger.info(f"Auto-triggered batch analysis {analysis_id} for dataset {result.inserted_id}")
            except Exception as e:
                logger.warning(f"Auto-trigger batch analysis on upload failed: {e}", exc_info=True)

        return DatasetResponse(
            id=str(result.inserted_id),
            filename=safe_filename,
            original_filename=original_name,
            file_size=file_size,
            rows=rows,
            columns=n_cols,
            status="ready",
            compatible=compat.compatible,
            farm=compat.farm,
            analysis_id=analysis_id,
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        )

    @classmethod
    async def get_user_datasets(cls, current_user: dict) -> List[DatasetResponse]:
        """Fetch all datasets owned by authenticated user."""
        datasets = get_datasets_collection()
        cursor = datasets.find({"user_id": current_user["_id"]}).sort("created_at", -1)
        items = []
        async for doc in cursor:
            items.append(DatasetResponse(
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
            ))
        return items

    @classmethod
    async def get_dataset_by_id(cls, dataset_id: str, current_user: dict) -> dict:
        """Fetch dataset document ensuring user ownership."""
        try:
            oid = ObjectId(dataset_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid dataset ID format.")

        datasets = get_datasets_collection()
        doc = await datasets.find_one({"_id": oid, "user_id": current_user["_id"]})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found or access denied.")
        return doc

    @classmethod
    async def get_summary(cls, dataset_id: str, current_user: dict) -> DatasetSummaryResponse:
        """Calculate statistical summary and exploration data for dataset."""
        doc = await cls.get_dataset_by_id(dataset_id, current_user)
        file_path = Path(doc["file_path"])

        if not file_path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset storage file not found.")

        df = cls._read_csv(file_path, nrows=10000)

        # Dtypes
        dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}

        # Missing values
        missing_vals = {col: int(cnt) for col, cnt in df.isnull().sum().items()}

        # Duplicate count
        dup_count = int(df.duplicated().sum())

        # Numerical statistics
        num_stats: Dict[str, Dict[str, Optional[float]]] = {}
        num_df = df.select_dtypes(include=[np.number])
        for col in num_df.columns:
            s = num_df[col].dropna()
            if not s.empty:
                num_stats[col] = {
                    "mean": float(round(s.mean(), 4)),
                    "std": float(round(s.std(), 4)) if len(s) > 1 else 0.0,
                    "min": float(round(s.min(), 4)),
                    "max": float(round(s.max(), 4)),
                    "median": float(round(s.median(), 4)),
                }
            else:
                num_stats[col] = {"mean": None, "std": None, "min": None, "max": None, "median": None}

        return DatasetSummaryResponse(
            id=str(doc["_id"]),
            rows=int(doc.get("rows", len(df))),
            columns=int(doc.get("columns", len(df.columns))),
            column_names=list(df.columns),
            dtypes=dtypes,
            missing_values=missing_vals,
            duplicate_count=dup_count,
            numerical_statistics=num_stats,
            detected_timestamp_col=doc.get("detected_timestamp_col"),
            detected_asset_col=doc.get("detected_asset_col"),
        )

    @classmethod
    async def get_quality(cls, dataset_id: str, current_user: dict) -> DatasetQualityResponse:
        """Inspect data quality (missingness, duplication, completeness)."""
        doc = await cls.get_dataset_by_id(dataset_id, current_user)
        file_path = Path(doc["file_path"])

        if not file_path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset storage file not found.")

        df = cls._read_csv(file_path, nrows=10000)
        total_cells = int(df.size)
        missing_cells = int(df.isnull().sum().sum())
        missing_pct = round((missing_cells / total_cells * 100.0) if total_cells > 0 else 0.0, 2)

        dup_rows = int(df.duplicated().sum())
        dup_pct = round((dup_rows / len(df) * 100.0) if len(df) > 0 else 0.0, 2)

        completeness = {}
        for col in df.columns:
            valid_cnt = int(df[col].notnull().sum())
            completeness[col] = round((valid_cnt / len(df) * 100.0) if len(df) > 0 else 0.0, 2)

        return DatasetQualityResponse(
            id=str(doc["_id"]),
            total_cells=total_cells,
            missing_cells=missing_cells,
            missing_percentage=missing_pct,
            duplicate_rows=dup_rows,
            duplicate_percentage=dup_pct,
            column_completeness=completeness,
        )

    @classmethod
    async def get_dataset_compatibility(cls, dataset_id: str, current_user: dict) -> DatasetCompatibilityResponse:
        """Check compatibility against trained wind turbine models."""
        doc = await cls.get_dataset_by_id(dataset_id, current_user)
        columns = doc.get("column_names", [])
        return cls.check_compatibility(columns)
