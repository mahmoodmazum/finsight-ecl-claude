"""
Permission-based access control.

Usage in routers:
    from app.core.rbac import require_permission

    @router.post("/ecl/run")
    async def run_ecl(user=Depends(require_permission("ecl:run"))):
        ...
"""
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.dependencies import get_current_user, get_db
from app.auth.models import User
from app.models.rbac import UserRole, RolePermission, Permission

_CACHE_KEY = "_rbac_permissions"


async def get_user_permissions(
    user_id: str,
    db: AsyncSession,
    request: Request | None = None,
) -> set[str]:
    """
    Returns the set of permission codes for a user.
    Caches the result on the request state for the duration of the request
    to avoid repeated DB queries within a single request.
    """
    if request is not None:
        cached = getattr(request.state, _CACHE_KEY, None)
        if cached is not None:
            return cached

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Permission.code)
        .join(RolePermission, Permission.permission_id == RolePermission.permission_id)
        .join(UserRole, RolePermission.role_id == UserRole.role_id)
        .where(
            UserRole.user_id == user_id,
            (UserRole.expires_at == None) | (UserRole.expires_at > now),  # noqa: E711
        )
        .distinct()
    )
    permissions: set[str] = set(result.scalars().all())

    if request is not None:
        request.state.__dict__[_CACHE_KEY] = permissions

    return permissions


def require_permission(permission_code: str):
    """
    FastAPI dependency factory that checks the caller has a specific permission.
    Returns the current User on success; raises 403 on failure.
    """
    async def checker(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        permissions = await get_user_permissions(current_user.user_id, db, request)
        if permission_code not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {permission_code}",
            )
        return current_user

    return checker
