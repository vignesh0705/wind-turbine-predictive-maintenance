from fastapi import APIRouter, Depends, status
from app.core.dependencies import get_current_user
from app.schemas.auth import UserSignUp, UserLogin, UserResponse, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(data: UserSignUp):
    """Register a new user account."""
    return await AuthService.signup(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Authenticate with email and password to obtain a JWT access token."""
    return await AuthService.login(data)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Retrieve details of the currently authenticated user."""
    return AuthService.get_me(current_user)
