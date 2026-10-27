import logging
from bson import ObjectId
from fastapi import HTTPException, status

from app.core.security import hash_password, verify_password, create_access_token
from app.database.mongodb import get_users_collection
from app.models.user import create_user_document
from app.schemas.auth import UserSignUp, UserLogin, UserResponse, TokenResponse

logger = logging.getLogger("wind_turbine_ai.auth_service")


class AuthService:
    @staticmethod
    async def signup(data: UserSignUp) -> UserResponse:
        users = get_users_collection()
        email = data.email.lower().strip()

        # Check existing user
        existing = await users.find_one({"email": email})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email address already exists.",
            )

        password_hash = hash_password(data.password)
        doc = create_user_document(name=data.name.strip(), email=email, password_hash=password_hash)
        result = await users.insert_one(doc)

        logger.info(f"User registered successfully: {email} ({result.inserted_id})")
        return UserResponse(
            id=str(result.inserted_id),
            name=doc["name"],
            email=doc["email"],
        )

    @staticmethod
    async def login(data: UserLogin) -> TokenResponse:
        users = get_users_collection()
        email = data.email.lower().strip()

        user = await users.find_one({"email": email})
        if not user or not verify_password(data.password, user.get("password_hash", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = create_access_token(data={"sub": str(user["_id"]), "email": user["email"]})
        logger.info(f"User logged in successfully: {email}")

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse(
                id=str(user["_id"]),
                name=user["name"],
                email=user["email"],
            ),
        )

    @staticmethod
    def get_me(user: dict) -> UserResponse:
        return UserResponse(
            id=str(user["_id"]),
            name=user["name"],
            email=user["email"],
        )
