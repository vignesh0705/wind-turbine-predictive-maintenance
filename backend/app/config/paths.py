from pathlib import Path
from typing import Dict, Any
from app.config.settings import settings

# Directory roots
CONFIG_DIR = Path(__file__).resolve().parent
APP_ROOT = CONFIG_DIR.parent
BACKEND_ROOT = APP_ROOT.parent
PROJECT_ROOT = BACKEND_ROOT.parent

# Resolve MODEL_ROOT
raw_model_root = Path(settings.MODEL_ROOT)
if raw_model_root.is_absolute():
    MODEL_ROOT = raw_model_root.resolve()
else:
    # Try resolving relative to BACKEND_ROOT first, then PROJECT_ROOT
    candidate_1 = (BACKEND_ROOT / raw_model_root).resolve()
    candidate_2 = (PROJECT_ROOT / "trained_models").resolve()
    if candidate_1.exists():
        MODEL_ROOT = candidate_1
    elif candidate_2.exists():
        MODEL_ROOT = candidate_2
    else:
        MODEL_ROOT = candidate_1

# Storage paths
raw_upload_dir = Path(settings.UPLOAD_DIR)
UPLOAD_DIR = raw_upload_dir.resolve() if raw_upload_dir.is_absolute() else (BACKEND_ROOT / raw_upload_dir).resolve()

raw_processed_dir = Path(settings.PROCESSED_DIR)
PROCESSED_DIR = raw_processed_dir.resolve() if raw_processed_dir.is_absolute() else (BACKEND_ROOT / raw_processed_dir).resolve()

raw_analysis_dir = Path(settings.ANALYSIS_RESULTS_DIR)
ANALYSIS_RESULTS_DIR = raw_analysis_dir.resolve() if raw_analysis_dir.is_absolute() else (BACKEND_ROOT / raw_analysis_dir).resolve()

# Key configuration files
FEATURE_CONFIG_PATH = MODEL_ROOT / "feature_config.json"
HEALTH_FUSION_CONFIG_PATH = MODEL_ROOT / "health" / "health_fusion_config.json"
MODEL_METADATA_PATH = MODEL_ROOT / "performance" / "model_metadata.json"

# Farm A Performance Model Artifacts
FARM_A_PERF_MODEL_PATH = MODEL_ROOT / "performance" / "farm_a_xgboost.joblib"
FARM_A_PERF_SCALER_PATH = MODEL_ROOT / "performance" / "scaler_farm_a_perf.joblib"

# Farm B Performance Model Artifacts
FARM_B_PERF_MODEL_PATH = MODEL_ROOT / "performance" / "farm_b_xgboost.joblib"
FARM_B_PERF_SCALER_PATH = MODEL_ROOT / "performance" / "scaler_farm_b_perf.joblib"

# Farm A Anomaly Model Artifacts
FARM_A_ANOMALY_AE_MODEL_PATH = MODEL_ROOT / "anomaly" / "farm_a_autoencoder.pt"
FARM_A_ANOMALY_AE_CONFIG_PATH = MODEL_ROOT / "anomaly" / "farm_a_autoencoder.json"
FARM_A_ANOMALY_IF_MODEL_PATH = MODEL_ROOT / "anomaly" / "farm_a_isolation_forest.joblib"
# Note: As confirmed by feature_config.json and model metadata, the active scaler is scaler_farm_a_anomaly.joblib
FARM_A_ANOMALY_SCALER_PATH = MODEL_ROOT / "anomaly" / "scaler_farm_a_anomaly.joblib"

# Farm B Anomaly Model Artifacts
FARM_B_ANOMALY_AE_MODEL_PATH = MODEL_ROOT / "anomaly" / "farm_b_autoencoder.pt"
FARM_B_ANOMALY_AE_CONFIG_PATH = MODEL_ROOT / "anomaly" / "farm_b_autoencoder.json"
FARM_B_ANOMALY_IF_MODEL_PATH = MODEL_ROOT / "anomaly" / "farm_b_isolation_forest.joblib"
FARM_B_ANOMALY_SCALER_PATH = MODEL_ROOT / "anomaly" / "scaler_farm_b_anomaly.joblib"

# Explainability output artifacts (if available in outputs/explainability)
EXPLAINABILITY_DIR = PROJECT_ROOT / "outputs" / "explainability"

# Dictionary of all required model artifacts for startup validation
REQUIRED_MODEL_ARTIFACTS: Dict[str, Path] = {
    "feature_config": FEATURE_CONFIG_PATH,
    "health_fusion_config": HEALTH_FUSION_CONFIG_PATH,
    "model_metadata": MODEL_METADATA_PATH,
    "farm_a_perf_model": FARM_A_PERF_MODEL_PATH,
    "farm_a_perf_scaler": FARM_A_PERF_SCALER_PATH,
    "farm_b_perf_model": FARM_B_PERF_MODEL_PATH,
    "farm_b_perf_scaler": FARM_B_PERF_SCALER_PATH,
    "farm_a_anomaly_ae_model": FARM_A_ANOMALY_AE_MODEL_PATH,
    "farm_a_anomaly_ae_config": FARM_A_ANOMALY_AE_CONFIG_PATH,
    "farm_a_anomaly_if_model": FARM_A_ANOMALY_IF_MODEL_PATH,
    "farm_a_anomaly_scaler": FARM_A_ANOMALY_SCALER_PATH,
    "farm_b_anomaly_ae_model": FARM_B_ANOMALY_AE_MODEL_PATH,
    "farm_b_anomaly_ae_config": FARM_B_ANOMALY_AE_CONFIG_PATH,
    "farm_b_anomaly_if_model": FARM_B_ANOMALY_IF_MODEL_PATH,
    "farm_b_anomaly_scaler": FARM_B_ANOMALY_SCALER_PATH,
}


def ensure_storage_dirs() -> None:
    """Create backend storage folders if they do not exist."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    ANALYSIS_RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def validate_required_artifacts() -> Dict[str, Any]:
    """
    Validate that all required model artifacts exist on disk.
    Raises FileNotFoundError with a descriptive error message if any required artifact is missing.
    """
    if not MODEL_ROOT.exists():
        raise FileNotFoundError(
            f"CRITICAL: Model root directory not found at '{MODEL_ROOT}'. "
            f"Please verify the MODEL_ROOT path configuration or ensure 'trained_models' exists."
        )

    missing = []
    for name, path in REQUIRED_MODEL_ARTIFACTS.items():
        if not path.exists():
            missing.append(f"{name}: {path}")

    if missing:
        missing_str = "\n  - " + "\n  - ".join(missing)
        raise FileNotFoundError(
            f"CRITICAL: The following required ML model artifacts are missing:{missing_str}\n"
            f"The backend cannot start without all verified model artifacts."
        )

    return {"status": "ok", "model_root": str(MODEL_ROOT), "artifacts_count": len(REQUIRED_MODEL_ARTIFACTS)}
