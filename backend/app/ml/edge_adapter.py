import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
import torch

from app.ml.model_manager import model_manager, FarmModels

logger = logging.getLogger("wind_turbine_ai.edge_adapter")


class EdgeAdapter:
    """
    Edge inference adapter that coordinates execution across:
    1. Farm-specific XGBoost performance model (power curve expectation)
    2. PyTorch Autoencoder (reconstruction error anomaly detection)
    3. Scikit-learn Isolation Forest (unsupervised density anomaly detection)
    4. Health fusion layer (component breakdown, health index, risk priority)
    """

    @staticmethod
    def _normalize_farm_key(farm: str) -> str:
        f = farm.upper().replace("_", " ").strip()
        if "A" in f:
            return "farm_a"
        elif "B" in f:
            return "farm_b"
        return "farm_a"

    @classmethod
    def run_inference_single(
        cls,
        farm: str,
        features: Dict[str, float],
        actual_power: Optional[float] = None,
        asset_id: str = "WTG_01",
        timestamp: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Run complete inference pipeline for a single SCADA measurement sample."""
        farm_models = model_manager.get_farm_models(farm)
        health_cfg = model_manager.get_health_config()
        farm_key = cls._normalize_farm_key(farm)

        # 1. Performance Model Features
        perf_features = farm_models.perf_features
        perf_vals = [float(features.get(f, 0.0)) for f in perf_features]
        X_perf = np.array([perf_vals], dtype=np.float32)

        X_perf_scaled = farm_models.perf_scaler.transform(X_perf)
        expected_power = float(farm_models.perf_model.predict(X_perf_scaled)[0])

        # If actual power not provided in explicit param, check features or target_col
        if actual_power is None:
            if farm_models.target_col in features:
                actual_power = float(features[farm_models.target_col])
            elif "actual_power" in features:
                actual_power = float(features["actual_power"])
            else:
                actual_power = expected_power

        residual = float(actual_power - expected_power)
        underperformance = max(0.0, float(expected_power - actual_power))

        # 2. Anomaly Model Features
        anom_features = farm_models.anomaly_features
        anom_vals = [float(features.get(f, 0.0)) for f in anom_features]
        X_anom = np.array([anom_vals], dtype=np.float32)

        X_anom_scaled = farm_models.anomaly_scaler.transform(X_anom)

        # PyTorch Autoencoder reconstruction
        with torch.no_grad():
            t_anom = torch.tensor(X_anom_scaled, dtype=torch.float32)
            recon = farm_models.autoencoder(t_anom).numpy()

        feature_errors = (X_anom_scaled - recon) ** 2
        ae_sample_mse = float(np.mean(feature_errors[0]))

        # Isolation Forest score
        if_raw = float(farm_models.isolation_forest.decision_function(X_anom_scaled)[0])

        # 3. Health Fusion Calculations
        norm_params = health_cfg.get("normalization_parameters", {}).get(farm_key, {})
        underperf_p99 = float(norm_params.get("underperf_p99", 0.1))
        ae_p99 = float(norm_params.get("ae_threshold_p99", 0.1))
        if_p01 = float(norm_params.get("if_p01", -0.15))
        if_p99 = float(norm_params.get("if_threshold_p99", 0.06))

        # Normalize performance degradation to [0, 1]
        perf_deg = min(1.0, max(0.0, underperformance / (underperf_p99 if underperf_p99 > 0 else 1.0)))

        # Normalize Autoencoder score to [0, 1]
        ae_score = min(1.0, max(0.0, ae_sample_mse / (ae_p99 if ae_p99 > 0 else 1.0)))

        # Normalize Isolation Forest score to [0, 1]
        if_denom = (if_p99 - if_p01) if (if_p99 - if_p01) != 0 else 1.0
        if_score = min(1.0, max(0.0, (if_p99 - if_raw) / if_denom))

        # Overall anomaly score
        overall_anomaly = float(0.5 * ae_score + 0.5 * if_score)

        # Component Degradation mapping
        comp_defs = health_cfg.get("component_definitions", {}).get(farm_key, {})
        anom_feat_indices = {feat: idx for idx, feat in enumerate(anom_features)}

        components: Dict[str, float] = {}
        for comp_name, comp_features in comp_defs.items():
            valid_indices = [anom_feat_indices[f] for f in comp_features if f in anom_feat_indices]
            if valid_indices:
                comp_mse = float(np.mean(feature_errors[0, valid_indices]))
                comp_deg = min(1.0, max(0.0, comp_mse / (ae_p99 if ae_p99 > 0 else 1.0)))
            else:
                comp_deg = 0.0
            components[comp_name] = round(comp_deg * 100.0, 2)

        # Dominant component has the highest degradation
        if components:
            dominant_component = max(components, key=components.get)
            max_comp_deg = max(components.values()) / 100.0
        else:
            dominant_component = "overall_system"
            max_comp_deg = overall_anomaly

        # Fusion weights
        weights = health_cfg.get("fusion_weights", {
            "performance_degradation": 0.35,
            "overall_anomaly": 0.35,
            "component_degradation": 0.30
        })

        raw_degradation = float(
            weights.get("performance_degradation", 0.35) * perf_deg
            + weights.get("overall_anomaly", 0.35) * overall_anomaly
            + weights.get("component_degradation", 0.30) * max_comp_deg
        )
        raw_degradation = min(1.0, max(0.0, raw_degradation))

        health_index = float(round(100.0 * (1.0 - raw_degradation), 2))
        risk_score = float(round(100.0 - health_index, 2))

        # Risk category classification
        risk_categories = health_cfg.get("risk_categories", {
            "LOW": [0, 25],
            "MEDIUM": [25, 50],
            "HIGH": [50, 75],
            "CRITICAL": [75, 100]
        })

        risk_category = "LOW"
        for cat, bounds in risk_categories.items():
            low_b, high_b = bounds[0], bounds[1]
            if low_b <= risk_score <= high_b or (cat == "CRITICAL" and risk_score >= low_b):
                risk_category = cat
                break

        return {
            "farm": farm_models.farm_name,
            "asset_id": asset_id,
            "timestamp": timestamp or "current",
            "actual_power": round(float(actual_power), 4),
            "expected_power": round(float(expected_power), 4),
            "residual": round(float(residual), 4),
            "anomaly_score": round(float(overall_anomaly), 4),
            "health_index": health_index,
            "risk_score": risk_score,
            "risk_category": risk_category,
            "dominant_component": dominant_component,
            "components": components,
            "explanation": {
                "perf_degradation_pct": round(perf_deg * 100.0, 2),
                "autoencoder_anomaly_pct": round(ae_score * 100.0, 2),
                "isolation_forest_anomaly_pct": round(if_score * 100.0, 2),
                "dominant_component": dominant_component,
                "dominant_component_degradation_pct": round(max_comp_deg * 100.0, 2),
            },
        }

    @classmethod
    def run_inference_df(
        cls,
        farm: str,
        df: pd.DataFrame,
        asset_col: Optional[str] = None,
        timestamp_col: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Run vectorized/batch inference on a pandas DataFrame.
        Returns a tuple of (prediction_records, summary_stats).
        """
        farm_models = model_manager.get_farm_models(farm)
        health_cfg = model_manager.get_health_config()
        farm_key = cls._normalize_farm_key(farm)

        norm_params = health_cfg.get("normalization_parameters", {}).get(farm_key, {})
        underperf_p99 = float(norm_params.get("underperf_p99", 0.1))
        ae_p99 = float(norm_params.get("ae_threshold_p99", 0.1))
        if_p01 = float(norm_params.get("if_p01", -0.15))
        if_p99 = float(norm_params.get("if_threshold_p99", 0.06))
        weights = health_cfg.get("fusion_weights", {
            "performance_degradation": 0.35,
            "overall_anomaly": 0.35,
            "component_degradation": 0.30
        })

        from app.ml.feature_engineering import prepare_features
        df = prepare_features(df, farm)

        # 1. Performance Model
        perf_features = farm_models.perf_features
        # Fill missing features with 0.0
        X_perf = df[perf_features].fillna(0.0).to_numpy(dtype=np.float32)
        X_perf_scaled = farm_models.perf_scaler.transform(X_perf)
        expected_powers = farm_models.perf_model.predict(X_perf_scaled)

        # Actual power resolution
        if farm_models.target_col in df.columns:
            actual_powers = df[farm_models.target_col].fillna(0.0).to_numpy(dtype=np.float32)
        elif "actual_power" in df.columns:
            actual_powers = df["actual_power"].fillna(0.0).to_numpy(dtype=np.float32)
        else:
            actual_powers = expected_powers.copy()

        residuals = actual_powers - expected_powers
        underperformances = np.maximum(0.0, expected_powers - actual_powers)
        perf_degs = np.clip(underperformances / (underperf_p99 if underperf_p99 > 0 else 1.0), 0.0, 1.0)

        # 2. Anomaly Models
        anom_features = farm_models.anomaly_features
        X_anom = df[anom_features].fillna(0.0).to_numpy(dtype=np.float32)
        X_anom_scaled = farm_models.anomaly_scaler.transform(X_anom)

        # PyTorch Autoencoder in mini-batches to conserve memory
        batch_size = 512
        n_rows = len(df)
        recons = []
        with torch.no_grad():
            for i in range(0, n_rows, batch_size):
                chunk = torch.tensor(X_anom_scaled[i : i + batch_size], dtype=torch.float32)
                recon_chunk = farm_models.autoencoder(chunk).numpy()
                recons.append(recon_chunk)
        recons = np.vstack(recons) if recons else np.empty((0, len(anom_features)))

        feature_errors = (X_anom_scaled - recons) ** 2
        ae_sample_mses = np.mean(feature_errors, axis=1)
        ae_scores = np.clip(ae_sample_mses / (ae_p99 if ae_p99 > 0 else 1.0), 0.0, 1.0)

        # Isolation Forest
        if_raws = farm_models.isolation_forest.decision_function(X_anom_scaled)
        if_denom = (if_p99 - if_p01) if (if_p99 - if_p01) != 0 else 1.0
        if_scores = np.clip((if_p99 - if_raws) / if_denom, 0.0, 1.0)

        overall_anomalies = 0.5 * ae_scores + 0.5 * if_scores

        # Component Degradations
        comp_defs = health_cfg.get("component_definitions", {}).get(farm_key, {})
        anom_feat_indices = {feat: idx for idx, feat in enumerate(anom_features)}
        comp_names = list(comp_defs.keys())
        comp_scores_matrix = np.zeros((n_rows, len(comp_names)), dtype=np.float32)

        for col_idx, comp_name in enumerate(comp_names):
            comp_features = comp_defs[comp_name]
            valid_indices = [anom_feat_indices[f] for f in comp_features if f in anom_feat_indices]
            if valid_indices:
                comp_mse = np.mean(feature_errors[:, valid_indices], axis=1)
                comp_scores_matrix[:, col_idx] = np.clip(comp_mse / (ae_p99 if ae_p99 > 0 else 1.0), 0.0, 1.0)

        max_comp_degs = np.max(comp_scores_matrix, axis=1) if comp_names else overall_anomalies
        dominant_indices = np.argmax(comp_scores_matrix, axis=1) if comp_names else np.zeros(n_rows, dtype=int)

        # 3. Fusion
        w_perf = weights.get("performance_degradation", 0.35)
        w_anom = weights.get("overall_anomaly", 0.35)
        w_comp = weights.get("component_degradation", 0.30)

        raw_degradations = np.clip(w_perf * perf_degs + w_anom * overall_anomalies + w_comp * max_comp_degs, 0.0, 1.0)
        health_indices = np.round(100.0 * (1.0 - raw_degradations), 2)
        risk_scores = np.round(100.0 - health_indices, 2)

        # Format records
        records = []
        low_count = int(np.sum((risk_scores >= 0) & (risk_scores < 25)))
        med_count = int(np.sum((risk_scores >= 25) & (risk_scores < 50)))
        high_count = int(np.sum((risk_scores >= 50) & (risk_scores < 75)))
        crit_count = int(np.sum(risk_scores >= 75))

        # Extract timestamps and asset IDs
        timestamps = df[timestamp_col].astype(str).tolist() if (timestamp_col and timestamp_col in df.columns) else [None] * n_rows
        asset_ids = df[asset_col].astype(str).tolist() if (asset_col and asset_col in df.columns) else ["WTG_01"] * n_rows

        for idx in range(n_rows):
            r_score = float(risk_scores[idx])
            if r_score < 25:
                cat = "LOW"
            elif r_score < 50:
                cat = "MEDIUM"
            elif r_score < 75:
                cat = "HIGH"
            else:
                cat = "CRITICAL"

            dom_comp = comp_names[dominant_indices[idx]] if comp_names else "overall_system"

            records.append({
                "asset_id": asset_ids[idx],
                "timestamp": timestamps[idx],
                "actual_power": float(np.round(actual_powers[idx], 4)),
                "expected_power": float(np.round(expected_powers[idx], 4)),
                "residual": float(np.round(residuals[idx], 4)),
                "anomaly_score": float(np.round(overall_anomalies[idx], 4)),
                "health_index": float(health_indices[idx]),
                "risk_score": r_score,
                "risk_category": cat,
                "dominant_component": dom_comp,
            })

        unique_turbines = set(asset_ids)
        summary = {
            "total_rows": n_rows,
            "total_turbines": len(unique_turbines),
            "average_health": float(np.round(np.mean(health_indices), 2)) if n_rows > 0 else 0.0,
            "average_risk": float(np.round(np.mean(risk_scores), 2)) if n_rows > 0 else 0.0,
            "low_count": low_count,
            "medium_count": med_count,
            "high_count": high_count,
            "critical_count": crit_count,
        }

        return records, summary
