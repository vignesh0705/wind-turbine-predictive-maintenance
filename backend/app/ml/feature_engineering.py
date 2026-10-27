import logging
from typing import List, Tuple, Optional
import numpy as np
import pandas as pd

logger = logging.getLogger("wind_turbine_ai.feature_engineering")


def is_farm_a_raw_scada(columns: List[str]) -> bool:
    """Check if column list matches Farm A raw SCADA telemetry."""
    cols = set(columns)
    if "power_30_avg" in cols or "power_29_avg" in cols:
        return True
    if "sensor_0_avg" in cols and "wind_speed_3_avg" in cols:
        return True
    return False


def is_farm_b_raw_scada(columns: List[str]) -> bool:
    """Check if column list matches Farm B raw SCADA telemetry."""
    cols = set(columns)
    if "power_62_avg" in cols or "power_58_avg" in cols:
        return True
    if "sensor_8_avg" in cols and "wind_speed_61_avg" in cols:
        return True
    return False


def _get_series(df: pd.DataFrame, col: str, default_val: float = 0.0) -> pd.Series:
    """Safely retrieve a column as pd.Series or return a default-filled Series with matching index."""
    if col in df.columns:
        return pd.to_numeric(df[col], errors="coerce").fillna(default_val).astype(np.float32)
    return pd.Series(default_val, index=df.index, dtype=np.float32)


def engineer_farm_a_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Derive all 20 performance features and 21 anomaly features from Farm A raw SCADA.
    Preserves existing features if already present in df.
    """
    df = df.copy()
    new_cols = {}

    # 1. Temporal cyclical features from timestamp
    time_col = None
    for c in ["time_stamp", "timestamp", "datetime", "time"]:
        if c in df.columns:
            time_col = c
            break

    if time_col is not None:
        ts = pd.to_datetime(df[time_col], errors="coerce").fillna(pd.Timestamp("2022-01-01"))
        if "sin_hour" not in df.columns:
            new_cols["sin_hour"] = np.sin(2.0 * np.pi * ts.dt.hour / 24.0).astype(np.float32)
        if "cos_hour" not in df.columns:
            new_cols["cos_hour"] = np.cos(2.0 * np.pi * ts.dt.hour / 24.0).astype(np.float32)
        if "sin_month" not in df.columns:
            new_cols["sin_month"] = np.sin(2.0 * np.pi * ts.dt.month / 12.0).astype(np.float32)
        if "cos_month" not in df.columns:
            new_cols["cos_month"] = np.cos(2.0 * np.pi * ts.dt.month / 12.0).astype(np.float32)
    else:
        if "sin_hour" not in df.columns:
            new_cols["sin_hour"] = pd.Series(0.0, index=df.index, dtype=np.float32)
        if "cos_hour" not in df.columns:
            new_cols["cos_hour"] = pd.Series(1.0, index=df.index, dtype=np.float32)
        if "sin_month" not in df.columns:
            new_cols["sin_month"] = pd.Series(0.0, index=df.index, dtype=np.float32)
        if "cos_month" not in df.columns:
            new_cols["cos_month"] = pd.Series(1.0, index=df.index, dtype=np.float32)

    # 2. Wind & Aerodynamic features
    ws = _get_series(df, "wind_speed_3_avg", 0.0)
    ws_std = _get_series(df, "wind_speed_3_std", 0.0)
    if "wind_speed_cube" not in df.columns:
        new_cols["wind_speed_cube"] = (ws ** 3).astype(np.float32)
    if "turbulence_intensity" not in df.columns:
        new_cols["turbulence_intensity"] = (ws_std / (ws + 1e-4)).astype(np.float32)

    wd = _get_series(df, "sensor_1_avg", 0.0)
    if "wind_dir_sin" not in df.columns:
        new_cols["wind_dir_sin"] = np.sin(np.radians(wd)).astype(np.float32)
    if "wind_dir_cos" not in df.columns:
        new_cols["wind_dir_cos"] = np.cos(np.radians(wd)).astype(np.float32)

    rpm = _get_series(df, "sensor_18_avg", 0.0)
    if "tip_speed_ratio" not in df.columns:
        new_cols["tip_speed_ratio"] = ((rpm * np.pi / 30.0 * 45.0) / (ws + 1e-4)).astype(np.float32)
    if "gear_ratio_dynamic" not in df.columns:
        new_cols["gear_ratio_dynamic"] = pd.Series(1.0, index=df.index, dtype=np.float32)

    # 3. Anomaly Temperature Deltas (relative to ambient sensor_0_avg)
    amb = _get_series(df, "sensor_0_avg", 20.0)
    dt_gearbox_bearing = (_get_series(df, "sensor_11_avg", 20.0) - amb).astype(np.float32)
    dt_gearbox_oil = (_get_series(df, "sensor_12_avg", 20.0) - amb).astype(np.float32)
    dt_gen_bearing_de = (_get_series(df, "sensor_13_avg", 20.0) - amb).astype(np.float32)
    dt_gen_bearing_nde = (_get_series(df, "sensor_14_avg", 20.0) - amb).astype(np.float32)
    dt_stator_windings = (_get_series(df, "sensor_15_avg", 20.0) - amb).astype(np.float32)
    dt_transformer = (_get_series(df, "sensor_38_avg", 20.0) - amb).astype(np.float32)
    dt_hydraulic_oil = (_get_series(df, "sensor_10_avg", 20.0) - amb).astype(np.float32)

    if "dt_gearbox_bearing" not in df.columns:
        new_cols["dt_gearbox_bearing"] = dt_gearbox_bearing
    if "dt_gearbox_oil" not in df.columns:
        new_cols["dt_gearbox_oil"] = dt_gearbox_oil
    if "dt_gen_bearing_de" not in df.columns:
        new_cols["dt_gen_bearing_de"] = dt_gen_bearing_de
    if "dt_gen_bearing_nde" not in df.columns:
        new_cols["dt_gen_bearing_nde"] = dt_gen_bearing_nde
    if "dt_stator_windings" not in df.columns:
        new_cols["dt_stator_windings"] = dt_stator_windings
    if "dt_transformer" not in df.columns:
        new_cols["dt_transformer"] = dt_transformer
    if "dt_hydraulic_oil" not in df.columns:
        new_cols["dt_hydraulic_oil"] = dt_hydraulic_oil

    # 4. Electrical Unbalances & Grid
    if "current_unbalance" not in df.columns:
        new_cols["current_unbalance"] = pd.Series(0.0, index=df.index, dtype=np.float32)
    if "voltage_unbalance" not in df.columns:
        new_cols["voltage_unbalance"] = pd.Series(0.0, index=df.index, dtype=np.float32)
    if "grid_freq_deviation" not in df.columns:
        s26 = _get_series(df, "sensor_26_avg", 50.0)
        new_cols["grid_freq_deviation"] = ((s26 - 50.0).abs()).astype(np.float32)

    # 5. Rolling & Rate Metrics
    ref_oil = df["dt_gearbox_oil"] if "dt_gearbox_oil" in df.columns else dt_gearbox_oil
    ref_gen = df["dt_gen_bearing_de"] if "dt_gen_bearing_de" in df.columns else dt_gen_bearing_de
    ref_hyd = df["dt_hydraulic_oil"] if "dt_hydraulic_oil" in df.columns else dt_hydraulic_oil

    if "gear_oil_roll_mean_6" not in df.columns:
        new_cols["gear_oil_roll_mean_6"] = ref_oil.rolling(6, min_periods=1).mean().astype(np.float32)
    if "gear_oil_roll_std_6" not in df.columns:
        new_cols["gear_oil_roll_std_6"] = ref_oil.rolling(6, min_periods=1).std().fillna(0.0).astype(np.float32)
    if "gen_bearing_roll_mean_6" not in df.columns:
        new_cols["gen_bearing_roll_mean_6"] = ref_gen.rolling(6, min_periods=1).mean().astype(np.float32)
    if "gen_bearing_roll_std_6" not in df.columns:
        new_cols["gen_bearing_roll_std_6"] = ref_gen.rolling(6, min_periods=1).std().fillna(0.0).astype(np.float32)
    if "hydraulic_roll_mean_6" not in df.columns:
        new_cols["hydraulic_roll_mean_6"] = ref_hyd.rolling(6, min_periods=1).mean().astype(np.float32)
    if "gear_oil_roll_mean_24" not in df.columns:
        new_cols["gear_oil_roll_mean_24"] = ref_oil.rolling(24, min_periods=1).mean().astype(np.float32)
    if "gen_bearing_roll_mean_24" not in df.columns:
        new_cols["gen_bearing_roll_mean_24"] = ref_gen.rolling(24, min_periods=1).mean().astype(np.float32)
    if "gear_oil_rate_1h" not in df.columns:
        new_cols["gear_oil_rate_1h"] = ref_oil.diff().fillna(0.0).astype(np.float32)
    if "gen_bearing_rate_1h" not in df.columns:
        new_cols["gen_bearing_rate_1h"] = ref_gen.diff().fillna(0.0).astype(np.float32)

    if new_cols:
        feat_df = pd.DataFrame(new_cols, index=df.index)
        return pd.concat([df, feat_df], axis=1)
    return df


def engineer_farm_b_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Derive all 21 performance features and 22 anomaly features from Farm B raw SCADA.
    Preserves existing features if already present in df.
    """
    df = df.copy()
    new_cols = {}

    # 1. Temporal cyclical features from timestamp
    time_col = None
    for c in ["time_stamp", "timestamp", "datetime", "time"]:
        if c in df.columns:
            time_col = c
            break

    if time_col is not None:
        ts = pd.to_datetime(df[time_col], errors="coerce").fillna(pd.Timestamp("2022-01-01"))
        if "sin_hour" not in df.columns:
            new_cols["sin_hour"] = np.sin(2.0 * np.pi * ts.dt.hour / 24.0).astype(np.float32)
        if "cos_hour" not in df.columns:
            new_cols["cos_hour"] = np.cos(2.0 * np.pi * ts.dt.hour / 24.0).astype(np.float32)
        if "sin_month" not in df.columns:
            new_cols["sin_month"] = np.sin(2.0 * np.pi * ts.dt.month / 12.0).astype(np.float32)
        if "cos_month" not in df.columns:
            new_cols["cos_month"] = np.cos(2.0 * np.pi * ts.dt.month / 12.0).astype(np.float32)
    else:
        if "sin_hour" not in df.columns:
            new_cols["sin_hour"] = pd.Series(0.0, index=df.index, dtype=np.float32)
        if "cos_hour" not in df.columns:
            new_cols["cos_hour"] = pd.Series(1.0, index=df.index, dtype=np.float32)
        if "sin_month" not in df.columns:
            new_cols["sin_month"] = pd.Series(0.0, index=df.index, dtype=np.float32)
        if "cos_month" not in df.columns:
            new_cols["cos_month"] = pd.Series(1.0, index=df.index, dtype=np.float32)

    # 2. Wind & Aerodynamic features
    ws = _get_series(df, "wind_speed_61_avg", 0.0)
    ws_std = _get_series(df, "wind_speed_61_std", 0.0)
    if "wind_speed_cube" not in df.columns:
        new_cols["wind_speed_cube"] = (ws ** 3).astype(np.float32)
    if "turbulence_intensity" not in df.columns:
        new_cols["turbulence_intensity"] = (ws_std / (ws + 1e-4)).astype(np.float32)

    wd = _get_series(df, "sensor_4_avg", 0.0)
    if "wind_dir_sin" not in df.columns:
        new_cols["wind_dir_sin"] = np.sin(np.radians(wd)).astype(np.float32)
    if "wind_dir_cos" not in df.columns:
        new_cols["wind_dir_cos"] = np.cos(np.radians(wd)).astype(np.float32)

    rotor_rpm = _get_series(df, "sensor_25_avg", 0.0)
    gen_rpm = _get_series(df, "sensor_19_avg", 0.0)
    if "tip_speed_ratio" not in df.columns:
        new_cols["tip_speed_ratio"] = (rotor_rpm / (ws + 1e-4)).astype(np.float32)
    if "gear_ratio_dynamic" not in df.columns:
        new_cols["gear_ratio_dynamic"] = (gen_rpm / (rotor_rpm + 1e-4)).astype(np.float32)

    # 3. Anomaly Temperature Deltas (relative to ambient sensor_8_avg)
    amb = _get_series(df, "sensor_8_avg", 20.0)
    dt_gen_1 = (_get_series(df, "sensor_32_avg", 20.0) - amb).astype(np.float32)
    dt_gen_2 = (_get_series(df, "sensor_33_avg", 20.0) - amb).astype(np.float32)
    dt_gb_1 = (_get_series(df, "sensor_34_avg", 20.0) - amb).astype(np.float32)
    dt_gb_2 = (_get_series(df, "sensor_35_avg", 20.0) - amb).astype(np.float32)
    dt_gb_oil_inlet = (_get_series(df, "sensor_38_avg", 20.0) - amb).astype(np.float32)
    dt_gb_oil_tank = (_get_series(df, "sensor_39_avg", 20.0) - amb).astype(np.float32)
    
    # sensor_47 is Transformer cell temperature (fallback to sensor_41)
    tra_sensor = "sensor_47_avg" if "sensor_47_avg" in df.columns else "sensor_41_avg"
    dt_transformer = (_get_series(df, tra_sensor, 20.0) - amb).astype(np.float32)
    
    # sensor_51 & 52 are Rotor bearing temperatures 1 & 2 (fallback to 43 & 44)
    rot1_sensor = "sensor_51_avg" if "sensor_51_avg" in df.columns else "sensor_43_avg"
    rot2_sensor = "sensor_52_avg" if "sensor_52_avg" in df.columns else "sensor_44_avg"
    dt_rotor_1 = (_get_series(df, rot1_sensor, 20.0) - amb).astype(np.float32)
    dt_rotor_2 = (_get_series(df, rot2_sensor, 20.0) - amb).astype(np.float32)

    if "dt_gen_bearing_1" not in df.columns:
        new_cols["dt_gen_bearing_1"] = dt_gen_1
    if "dt_gen_bearing_2" not in df.columns:
        new_cols["dt_gen_bearing_2"] = dt_gen_2
    if "dt_gearbox_bearing_1" not in df.columns:
        new_cols["dt_gearbox_bearing_1"] = dt_gb_1
    if "dt_gearbox_bearing_2" not in df.columns:
        new_cols["dt_gearbox_bearing_2"] = dt_gb_2
    if "dt_gearbox_oil_inlet" not in df.columns:
        new_cols["dt_gearbox_oil_inlet"] = dt_gb_oil_inlet
    if "dt_gearbox_oil_tank" not in df.columns:
        new_cols["dt_gearbox_oil_tank"] = dt_gb_oil_tank
    if "dt_transformer_cell" not in df.columns:
        new_cols["dt_transformer_cell"] = dt_transformer
    if "dt_rotor_bearing_1" not in df.columns:
        new_cols["dt_rotor_bearing_1"] = dt_rotor_1
    if "dt_rotor_bearing_2" not in df.columns:
        new_cols["dt_rotor_bearing_2"] = dt_rotor_2

    # 4. Vibration & Grid
    # sensor_55 is Tower vibration X, sensor_56 is Tower vibration Y
    vx = _get_series(df, "sensor_55_avg", 0.0)
    vy = _get_series(df, "sensor_56_avg", 0.0)
    vmag = np.sqrt(vx**2 + vy**2).astype(np.float32)
    
    # sensor_54 is Drive train vibration axis Z
    vz = _get_series(df, "sensor_54_avg", 0.0)

    if "vibration_magnitude_tower" not in df.columns:
        new_cols["vibration_magnitude_tower"] = vmag
    if "vibration_drivetrain_z" not in df.columns:
        new_cols["vibration_drivetrain_z"] = vz
        
    # sensor_12 is Torque estimated (Nm), fallback sensor_5 or sensor_57
    torque_col = "sensor_12_avg" if "sensor_12_avg" in df.columns else ("sensor_5_avg" if "sensor_5_avg" in df.columns else "sensor_57_avg")
    if "torque_total" not in df.columns:
        new_cols["torque_total"] = _get_series(df, torque_col, 0.0)
    if "grid_freq_deviation" not in df.columns:
        s23 = _get_series(df, "sensor_23_avg", 50.0)
        new_cols["grid_freq_deviation"] = ((s23 - 50.0).abs()).astype(np.float32)

    # 5. Rolling & Rate Metrics
    ref_rot = df["dt_rotor_bearing_1"] if "dt_rotor_bearing_1" in df.columns else dt_rotor_1
    ref_tra = df["dt_transformer_cell"] if "dt_transformer_cell" in df.columns else dt_transformer
    ref_vib = df["vibration_magnitude_tower"] if "vibration_magnitude_tower" in df.columns else vmag

    if "rotor_bearing_roll_mean_6" not in df.columns:
        new_cols["rotor_bearing_roll_mean_6"] = ref_rot.rolling(6, min_periods=1).mean().astype(np.float32)
    if "rotor_bearing_roll_std_6" not in df.columns:
        new_cols["rotor_bearing_roll_std_6"] = ref_rot.rolling(6, min_periods=1).std().fillna(0.0).astype(np.float32)
    if "transformer_cell_roll_mean_6" not in df.columns:
        new_cols["transformer_cell_roll_mean_6"] = ref_tra.rolling(6, min_periods=1).mean().astype(np.float32)
    if "transformer_cell_roll_std_6" not in df.columns:
        new_cols["transformer_cell_roll_std_6"] = ref_tra.rolling(6, min_periods=1).std().fillna(0.0).astype(np.float32)
    if "vibration_roll_mean_6" not in df.columns:
        new_cols["vibration_roll_mean_6"] = ref_vib.rolling(6, min_periods=1).mean().astype(np.float32)
    if "rotor_bearing_roll_mean_24" not in df.columns:
        new_cols["rotor_bearing_roll_mean_24"] = ref_rot.rolling(24, min_periods=1).mean().astype(np.float32)
    if "transformer_cell_roll_mean_24" not in df.columns:
        new_cols["transformer_cell_roll_mean_24"] = ref_tra.rolling(24, min_periods=1).mean().astype(np.float32)
    if "rotor_bearing_rate_1h" not in df.columns:
        new_cols["rotor_bearing_rate_1h"] = ref_rot.diff().fillna(0.0).astype(np.float32)
    if "transformer_cell_rate_1h" not in df.columns:
        new_cols["transformer_cell_rate_1h"] = ref_tra.diff().fillna(0.0).astype(np.float32)

    if new_cols:
        feat_df = pd.DataFrame(new_cols, index=df.index)
        return pd.concat([df, feat_df], axis=1)
    return df


def prepare_features(df: pd.DataFrame, farm: str) -> pd.DataFrame:
    """
    Ensure all features required by the farm's models are present in the DataFrame.
    If raw SCADA columns are detected, automatically applies feature engineering.
    """
    f = farm.upper().replace("_", " ").strip()
    target_farm = "B" if "B" in f else "A"

    try:
        from app.ml.model_manager import model_manager
        farm_models = model_manager.get_farm_models(target_farm)
        required = set(farm_models.perf_features + farm_models.anomaly_features)
        if required.issubset(set(df.columns)):
            return df
    except Exception:
        pass

    if target_farm == "B":
        return engineer_farm_b_features(df)
    else:
        return engineer_farm_a_features(df)
