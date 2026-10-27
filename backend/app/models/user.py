from datetime import datetime, timezone
from typing import Optional, Dict, Any
from bson import ObjectId


def create_user_document(name: str, email: str, password_hash: str) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "name": name,
        "email": email.lower().strip(),
        "password_hash": password_hash,
        "created_at": now,
        "updated_at": now,
    }
