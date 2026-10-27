import math
from datetime import datetime, date
from typing import Any, Dict, List, Union
import numpy as np
import pandas as pd
from bson import ObjectId


def sanitize_value(val: Any) -> Any:
    """
    Recursively sanitize any Python, NumPy, pandas, or BSON object
    into standard JSON-compliant types, handling NaN, inf, dates, and ObjectId.
    """
    if val is None:
        return None

    # Handle BSON ObjectId
    if isinstance(val, ObjectId):
        return str(val)

    # Handle Datetime and Date
    if isinstance(val, (datetime, date)):
        return val.isoformat()

    # Handle pandas Timestamp
    if isinstance(val, pd.Timestamp):
        if pd.isna(val):
            return None
        return val.isoformat()

    # Handle float / numpy float checks for NaN / Inf
    if isinstance(val, (float, np.floating)):
        if math.isnan(val) or np.isnan(val):
            return None
        if math.isinf(val) or np.isinf(val):
            return None
        return float(val)

    # Handle NumPy integer types
    if isinstance(val, (int, np.integer)):
        return int(val)

    # Handle NumPy bool
    if isinstance(val, (bool, np.bool_)):
        return bool(val)

    # Handle NumPy ndarray
    if isinstance(val, np.ndarray):
        return [sanitize_value(x) for x in val.tolist()]

    # Handle list or tuple
    if isinstance(val, (list, tuple)):
        return [sanitize_value(x) for x in val]

    # Handle dictionary
    if isinstance(val, dict):
        return {str(k): sanitize_value(v) for k, v in val.items()}

    # Check for pandas NA
    try:
        if pd.isna(val):
            return None
    except Exception:
        pass

    return val


def sanitize_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize a single dictionary record."""
    return {k: sanitize_value(v) for k, v in record.items()}


def sanitize_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sanitize a list of dictionary records."""
    return [sanitize_record(r) for r in records]
