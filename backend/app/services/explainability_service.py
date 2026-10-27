import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd

from app.config.paths import EXPLAINABILITY_DIR
from app.ml.model_manager import model_manager

logger = logging.getLogger("wind_turbine_ai.explainability_service")


class ExplainabilityService:
    @classmethod
    def get_global_explainability(cls, farm: str = "A") -> Dict[str, Any]:
        """
        Check for precomputed SHAP assets on disk. If absent, fallback gracefully
        to extracting actual feature importances directly from the loaded XGBoost model.
        Never fabricate fake SHAP data.
        """
        farm_key = "farm_a" if "A" in farm.upper() else "farm_b"
        farm_models = model_manager.get_farm_models(farm)

        csv_path = EXPLAINABILITY_DIR / f"{farm_key}_shap_feature_importance.csv"
        bar_plot_path = EXPLAINABILITY_DIR / f"{farm_key}_shap_global_bar.png"
        beeswarm_path = EXPLAINABILITY_DIR / f"{farm_key}_shap_summary_beeswarm.png"

        shap_available = csv_path.exists()
        feature_importance_list = []

        if shap_available:
            try:
                df = pd.read_csv(csv_path)
                feature_importance_list = df.to_dict(orient="records")
            except Exception as e:
                logger.warning(f"Failed to read existing SHAP CSV: {e}")
                shap_available = False

        # If static SHAP output files do not exist in the project,
        # derive actual feature importances directly from the verified XGBoost model
        if not feature_importance_list and hasattr(farm_models.perf_model, "feature_importances_"):
            raw_importances = farm_models.perf_model.feature_importances_
            feature_names = farm_models.perf_features
            sorted_pairs = sorted(
                zip(feature_names, [float(x) for x in raw_importances]),
                key=lambda x: x[1],
                reverse=True,
            )
            feature_importance_list = [
                {"feature": feat, "importance": round(imp, 6)} for feat, imp in sorted_pairs
            ]

        return {
            "farm": farm_models.farm_name,
            "shap_assets_available": shap_available,
            "shap_bar_plot_path": str(bar_plot_path) if bar_plot_path.exists() else None,
            "shap_beeswarm_plot_path": str(beeswarm_path) if beeswarm_path.exists() else None,
            "feature_importance_source": "precomputed_shap_csv" if shap_available else "xgboost_native_gain",
            "feature_importances": feature_importance_list,
            "message": (
                "SHAP asset files loaded from outputs/explainability."
                if shap_available
                else "Precomputed static SHAP visual artifacts are not present in project root. "
                     "Displaying native model feature importances directly from the loaded XGBoost model."
            ),
        }

    @classmethod
    def get_local_explainability(cls, asset_id: str, farm: str = "A") -> Dict[str, Any]:
        """
        Check for local event SHAP plots or local explanation assets for a specific asset/turbine.
        """
        farm_key = "farm_a" if "A" in farm.upper() else "farm_b"
        event1_path = EXPLAINABILITY_DIR / f"{farm_key}_shap_local_critical_event_1.png"
        event2_path = EXPLAINABILITY_DIR / f"{farm_key}_shap_local_critical_event_2.png"

        has_local = event1_path.exists() or event2_path.exists()

        return {
            "asset_id": asset_id,
            "farm": farm,
            "local_shap_plots_available": has_local,
            "event_1_plot": str(event1_path) if event1_path.exists() else None,
            "event_2_plot": str(event2_path) if event2_path.exists() else None,
            "message": (
                "Local SHAP event plots located."
                if has_local
                else f"Local SHAP plots for asset '{asset_id}' are not currently present in outputs/explainability."
            ),
        }
