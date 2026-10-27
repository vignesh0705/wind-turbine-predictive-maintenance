import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import joblib
import torch
import torch.nn as nn

from app.config.paths import (
    FEATURE_CONFIG_PATH,
    HEALTH_FUSION_CONFIG_PATH,
    MODEL_METADATA_PATH,
    FARM_A_PERF_MODEL_PATH,
    FARM_A_PERF_SCALER_PATH,
    FARM_B_PERF_MODEL_PATH,
    FARM_B_PERF_SCALER_PATH,
    FARM_A_ANOMALY_AE_MODEL_PATH,
    FARM_A_ANOMALY_AE_CONFIG_PATH,
    FARM_A_ANOMALY_IF_MODEL_PATH,
    FARM_A_ANOMALY_SCALER_PATH,
    FARM_B_ANOMALY_AE_MODEL_PATH,
    FARM_B_ANOMALY_AE_CONFIG_PATH,
    FARM_B_ANOMALY_IF_MODEL_PATH,
    FARM_B_ANOMALY_SCALER_PATH,
    validate_required_artifacts,
)

logger = logging.getLogger("wind_turbine_ai.model_manager")


class AutoEncoder(nn.Module):
    """
    PyTorch Autoencoder matching the architecture of farm_a_autoencoder.pt (21)
    and farm_b_autoencoder.pt (22).
    """
    def __init__(self, input_dim: int):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
        )
        self.decoder = nn.Sequential(
            nn.Linear(16, 32),
            nn.ReLU(),
            nn.Linear(32, 64),
            nn.ReLU(),
            nn.Linear(64, input_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.decoder(self.encoder(x))


class FarmModels:
    """Encapsulates all trained model artifacts for a specific wind farm."""
    def __init__(
        self,
        farm_name: str,
        perf_model: Any,
        perf_scaler: Any,
        autoencoder: nn.Module,
        autoencoder_config: Dict[str, Any],
        isolation_forest: Any,
        isolation_forest_meta: Dict[str, Any],
        anomaly_scaler: Any,
        perf_features: list,
        anomaly_features: list,
        target_col: str,
    ):
        self.farm_name = farm_name
        self.perf_model = perf_model
        self.perf_scaler = perf_scaler
        self.autoencoder = autoencoder
        self.autoencoder_config = autoencoder_config
        self.isolation_forest = isolation_forest
        self.isolation_forest_meta = isolation_forest_meta
        self.anomaly_scaler = anomaly_scaler
        self.perf_features = perf_features
        self.anomaly_features = anomaly_features
        self.target_col = target_col


class ModelManager:
    """
    Singleton manager responsible for safely validating, loading,
    and serving all existing trained models in memory.
    """
    _instance: Optional["ModelManager"] = None

    def __init__(self):
        self.loaded: bool = False
        self.feature_config: Dict[str, Any] = {}
        self.health_fusion_config: Dict[str, Any] = {}
        self.model_metadata: Dict[str, Any] = {}
        self.farm_a: Optional[FarmModels] = None
        self.farm_b: Optional[FarmModels] = None

    @classmethod
    def get_instance(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_models(self) -> None:
        """
        Validate and load all model artifacts into memory once at startup.
        Fails fast with detailed FileNotFoundError if any artifact is missing.
        """
        if self.loaded:
            logger.info("Models already loaded in memory.")
            return

        logger.info("Starting model artifact validation and loading...")
        validate_required_artifacts()

        # 1. Load JSON configurations
        with open(FEATURE_CONFIG_PATH, "r", encoding="utf-8") as f:
            self.feature_config = json.load(f)

        with open(HEALTH_FUSION_CONFIG_PATH, "r", encoding="utf-8") as f:
            self.health_fusion_config = json.load(f)

        with open(MODEL_METADATA_PATH, "r", encoding="utf-8") as f:
            self.model_metadata = json.load(f)

        # 2. Extract feature configs for Farm A and Farm B
        fa_cfg = self.feature_config.get("farms", {}).get("Wind Farm A", {})
        fb_cfg = self.feature_config.get("farms", {}).get("Wind Farm B", {})

        # 3. Load Farm A Performance Models
        logger.info("Loading Farm A XGBoost model and scaler...")
        fa_perf_model = joblib.load(FARM_A_PERF_MODEL_PATH)
        fa_perf_scaler = joblib.load(FARM_A_PERF_SCALER_PATH)

        # 4. Load Farm A Anomaly Models
        logger.info("Loading Farm A Autoencoder, Isolation Forest, and anomaly scaler...")
        with open(FARM_A_ANOMALY_AE_CONFIG_PATH, "r", encoding="utf-8") as f:
            fa_ae_config = json.load(f)

        fa_ae = AutoEncoder(input_dim=fa_ae_config.get("input_dim", 21))
        fa_ae_state = torch.load(FARM_A_ANOMALY_AE_MODEL_PATH, map_location=torch.device("cpu"))
        fa_ae.load_state_dict(fa_ae_state)
        fa_ae.eval()

        fa_if_artifact = joblib.load(FARM_A_ANOMALY_IF_MODEL_PATH)
        fa_if_model = fa_if_artifact["model"] if isinstance(fa_if_artifact, dict) else fa_if_artifact
        fa_if_meta = fa_if_artifact if isinstance(fa_if_artifact, dict) else {}

        fa_anomaly_scaler = joblib.load(FARM_A_ANOMALY_SCALER_PATH)

        self.farm_a = FarmModels(
            farm_name="Wind Farm A",
            perf_model=fa_perf_model,
            perf_scaler=fa_perf_scaler,
            autoencoder=fa_ae,
            autoencoder_config=fa_ae_config,
            isolation_forest=fa_if_model,
            isolation_forest_meta=fa_if_meta,
            anomaly_scaler=fa_anomaly_scaler,
            perf_features=fa_cfg.get("perf_features", []),
            anomaly_features=fa_cfg.get("anomaly_features", []),
            target_col=fa_cfg.get("target_col", "power_30_avg"),
        )

        # 5. Load Farm B Performance Models
        logger.info("Loading Farm B XGBoost model and scaler...")
        fb_perf_model = joblib.load(FARM_B_PERF_MODEL_PATH)
        fb_perf_scaler = joblib.load(FARM_B_PERF_SCALER_PATH)

        # 6. Load Farm B Anomaly Models
        logger.info("Loading Farm B Autoencoder, Isolation Forest, and anomaly scaler...")
        with open(FARM_B_ANOMALY_AE_CONFIG_PATH, "r", encoding="utf-8") as f:
            fb_ae_config = json.load(f)

        fb_ae = AutoEncoder(input_dim=fb_ae_config.get("input_dim", 22))
        fb_ae_state = torch.load(FARM_B_ANOMALY_AE_MODEL_PATH, map_location=torch.device("cpu"))
        fb_ae.load_state_dict(fb_ae_state)
        fb_ae.eval()

        fb_if_artifact = joblib.load(FARM_B_ANOMALY_IF_MODEL_PATH)
        fb_if_model = fb_if_artifact["model"] if isinstance(fb_if_artifact, dict) else fb_if_artifact
        fb_if_meta = fb_if_artifact if isinstance(fb_if_artifact, dict) else {}

        fb_anomaly_scaler = joblib.load(FARM_B_ANOMALY_SCALER_PATH)

        self.farm_b = FarmModels(
            farm_name="Wind Farm B",
            perf_model=fb_perf_model,
            perf_scaler=fb_perf_scaler,
            autoencoder=fb_ae,
            autoencoder_config=fb_ae_config,
            isolation_forest=fb_if_model,
            isolation_forest_meta=fb_if_meta,
            anomaly_scaler=fb_anomaly_scaler,
            perf_features=fb_cfg.get("perf_features", []),
            anomaly_features=fb_cfg.get("anomaly_features", []),
            target_col=fb_cfg.get("target_col", "power_62_avg"),
        )

        self.loaded = True
        logger.info("All trained models and configurations successfully loaded into memory.")

    def get_farm_models(self, farm: str) -> FarmModels:
        """
        Get farm models for Farm A or Farm B.
        Supports 'A', 'farm_a', 'Wind Farm A', etc.
        """
        if not self.loaded:
            self.load_models()

        clean_farm = farm.upper().replace("_", " ").replace("WIND", "").strip()
        if clean_farm in ["A", "FARM A"]:
            if self.farm_a is None:
                raise RuntimeError("Farm A models are not loaded.")
            return self.farm_a
        elif clean_farm in ["B", "FARM B"]:
            if self.farm_b is None:
                raise RuntimeError("Farm B models are not loaded.")
            return self.farm_b
        else:
            raise ValueError(f"Unknown farm identifier '{farm}'. Expected 'A' or 'B'.")

    def get_feature_config(self) -> Dict[str, Any]:
        if not self.loaded:
            self.load_models()
        return self.feature_config

    def get_health_config(self) -> Dict[str, Any]:
        if not self.loaded:
            self.load_models()
        return self.health_fusion_config

    def get_model_metadata(self) -> Dict[str, Any]:
        if not self.loaded:
            self.load_models()
        return self.model_metadata


# Global singleton accessor
model_manager = ModelManager.get_instance()
