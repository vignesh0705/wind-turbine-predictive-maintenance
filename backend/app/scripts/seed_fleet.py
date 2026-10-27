import glob
import logging
from pathlib import Path
import pandas as pd
from pymongo import MongoClient

from app.config.settings import settings
from app.ml.model_manager import model_manager
from app.ml.edge_adapter import EdgeAdapter

logger = logging.getLogger("wind_turbine_ai.seed_fleet")


def seed_fleet_for_user(user_id=None):
    """
    Evaluate sample telemetry for all turbines in Wind Farm A datasets
    and register them into the MongoDB turbines collection.
    """
    model_manager.load_models()
    client = MongoClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]

    if user_id is None:
        user = db["users"].find_one(sort=[("created_at", -1)])
        if not user:
            print("No users found.")
            return
        user_id = user["_id"]

    files = sorted(glob.glob("storage/Wind Farm A/datasets/*.csv"))
    print(f"Evaluating {len(files)} turbine datasets for user {user_id}...")

    for f in files:
        fname = Path(f).stem
        try:
            df = pd.read_csv(f, sep=";", nrows=100)
            recs, summ = EdgeAdapter.run_inference_df("A", df, asset_col="asset_id", timestamp_col="time_stamp")
            last = recs[-1]
            t_num = int(fname) if fname.isdigit() else 0
            t_id = f"WTG_{t_num:02d}"

            db["turbines"].update_one(
                {"user_id": user_id, "turbine_id": t_id},
                {
                    "$set": {
                        "farm": "Wind Farm A",
                        "name": f"Turbine {t_id}",
                        "latest_health": float(last["health_index"]),
                        "latest_risk": float(last["risk_score"]),
                        "latest_risk_category": str(last["risk_category"]),
                        "dominant_component": str(last["dominant_component"]),
                        "latest_prediction_timestamp": str(last.get("timestamp")),
                    }
                },
                upsert=True,
            )
        except Exception as e:
            print(f"Error on {fname}: {e}")

    total = db["turbines"].count_documents({"user_id": user_id})
    print(f"Done! Total turbines registered for user: {total}")


if __name__ == "__main__":
    seed_fleet_for_user()
