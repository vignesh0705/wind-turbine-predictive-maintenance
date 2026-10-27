import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config.settings import settings

logger = logging.getLogger("wind_turbine_ai.database")


class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None


db_state = MongoDB()


async def connect_to_mongo() -> None:
    """Connect to MongoDB using configured URI."""
    try:
        logger.info(f"Connecting to MongoDB at {settings.MONGO_URI} (db: {settings.MONGO_DB_NAME})")
        db_state.client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000,
        )
        db_state.db = db_state.client[settings.MONGO_DB_NAME]
        # Ping database to verify connection
        await db_state.client.admin.command("ping")
        logger.info("Successfully connected to MongoDB.")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise e


async def close_mongo_connection() -> None:
    """Close MongoDB client connection."""
    if db_state.client is not None:
        logger.info("Closing MongoDB connection.")
        db_state.client.close()
        db_state.client = None
        db_state.db = None


def get_database() -> AsyncIOMotorDatabase:
    """Get active MongoDB database instance."""
    if db_state.db is None:
        raise RuntimeError("Database is not connected. Call connect_to_mongo() first.")
    return db_state.db


def get_client() -> AsyncIOMotorClient:
    """Get active MongoDB client instance."""
    if db_state.client is None:
        raise RuntimeError("MongoDB client is not connected.")
    return db_state.client


# Collection accessor helpers
def get_users_collection():
    return get_database()["users"]


def get_datasets_collection():
    return get_database()["datasets"]


def get_analyses_collection():
    return get_database()["analyses"]


def get_predictions_collection():
    return get_database()["predictions"]


def get_alerts_collection():
    return get_database()["alerts"]


def get_turbines_collection():
    return get_database()["turbines"]
