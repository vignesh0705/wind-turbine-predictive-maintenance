import logging
import pymongo
from app.database.mongodb import (
    get_users_collection,
    get_datasets_collection,
    get_analyses_collection,
    get_predictions_collection,
    get_alerts_collection,
    get_turbines_collection,
)

logger = logging.getLogger("wind_turbine_ai.indexes")


async def create_indexes() -> None:
    """
    Create necessary indexes for all MongoDB collections:
    - users.email (unique)
    - datasets.user_id
    - analyses.user_id
    - analyses.dataset_id
    - predictions.analysis_id
    - alerts.analysis_id
    - alerts.asset_id
    - turbines.user_id
    - turbines.turbine_id
    """
    logger.info("Creating MongoDB indexes...")
    try:
        users = get_users_collection()
        await users.create_index([("email", pymongo.ASCENDING)], unique=True)

        datasets = get_datasets_collection()
        await datasets.create_index([("user_id", pymongo.ASCENDING)])
        await datasets.create_index([("created_at", pymongo.DESCENDING)])

        analyses = get_analyses_collection()
        await analyses.create_index([("user_id", pymongo.ASCENDING)])
        await analyses.create_index([("dataset_id", pymongo.ASCENDING)])
        await analyses.create_index([("created_at", pymongo.DESCENDING)])

        predictions = get_predictions_collection()
        await predictions.create_index([("analysis_id", pymongo.ASCENDING)])
        await predictions.create_index([("asset_id", pymongo.ASCENDING)])
        await predictions.create_index([("timestamp", pymongo.DESCENDING)])
        await predictions.create_index([("analysis_id", pymongo.ASCENDING), ("asset_id", pymongo.ASCENDING)])

        alerts = get_alerts_collection()
        await alerts.create_index([("analysis_id", pymongo.ASCENDING)])
        await alerts.create_index([("asset_id", pymongo.ASCENDING)])
        await alerts.create_index([("severity", pymongo.ASCENDING)])
        await alerts.create_index([("created_at", pymongo.DESCENDING)])

        turbines = get_turbines_collection()
        await turbines.create_index([("user_id", pymongo.ASCENDING)])
        await turbines.create_index([("turbine_id", pymongo.ASCENDING)])
        await turbines.create_index([("user_id", pymongo.ASCENDING), ("turbine_id", pymongo.ASCENDING)], unique=True)

        logger.info("MongoDB indexes created successfully.")
    except Exception as e:
        logger.error(f"Error creating MongoDB indexes: {e}")
        raise e
