from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database import get_db
from app.auth.models import User, RefreshToken
from app.auth.schemas import LoginRequest, TokenResponse, RefreshRequest, UserOut, RoleOut
from app.auth.service import (
    verify_password, create_access_token, create_refresh_token,
    verify_refresh_token, hash_token,
)
from app.core.exceptions import UnauthorizedException
from app.core.dependencies import get_current_user
from app.core.audit import write_audit_event
from app.models.rbac import UserRole, Role, RolePermission, Permission

router = APIRouter()


async def _load_user_roles_and_permissions(
    user_id: str, db: AsyncSession
) -> tuple[list[RoleOut], list[str]]:
    """Load roles and permission codes for a user."""
    # Roles
    role_result = await db.execute(
        select(Role)
        .join(UserRole, Role.role_id == UserRole.role_id)
        .where(UserRole.user_id == user_id)
    )
    roles = [RoleOut.model_validate(r) for r in role_result.scalars().all()]

    # Permissions
    perm_result = await db.execute(
        select(Permission.code)
        .join(RolePermission, Permission.permission_id == RolePermission.permission_id)
        .join(UserRole, RolePermission.role_id == UserRole.role_id)
        .where(UserRole.user_id == user_id)
        .distinct()
    )
    permissions = sorted(perm_result.scalars().all())

    return roles, permissions


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise UnauthorizedException("Invalid email or password")
    if not user.is_active:
        raise UnauthorizedException("Account is disabled")

    roles, permissions = await _load_user_roles_and_permissions(user.user_id, db)

    access_token = create_access_token(
        user_id=user.user_id,
        email=user.email,
        full_name=user.full_name,
        permissions=permissions,
    )
    refresh_token_raw, expires_at = create_refresh_token(user.user_id)

    db.add(RefreshToken(
        user_id=user.user_id,
        token_hash=hash_token(refresh_token_raw),
        expires_at=expires_at,
    ))

    await db.execute(
        update(User)
        .where(User.user_id == user.user_id)
        .values(last_login=datetime.now(timezone.utc))
    )

    await write_audit_event(
        db,
        event_type="USER_LOGIN",
        entity_type="user",
        entity_id=user.user_id,
        user_id=user.user_id,
        user_ip=request.client.host if request.client else None,
        after_state={"email": user.email},
    )
    await db.commit()

    user_out = UserOut.model_validate(user)
    user_out.roles = roles
    user_out.permissions = permissions

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_raw,
        user=user_out,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = verify_refresh_token(body.refresh_token)
    if not payload:
        raise UnauthorizedException("Invalid or expired refresh token")

    token_hash = hash_token(body.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    db_token = result.scalar_one_or_none()
    if not db_token:
        raise UnauthorizedException("Refresh token not found or already revoked")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise UnauthorizedException("User not found or inactive")

    db_token.revoked = True

    roles, permissions = await _load_user_roles_and_permissions(user.user_id, db)

    access_token = create_access_token(
        user_id=user.user_id,
        email=user.email,
        full_name=user.full_name,
        permissions=permissions,
    )
    refresh_token_raw, expires_at = create_refresh_token(user.user_id)

    db.add(RefreshToken(
        user_id=user.user_id,
        token_hash=hash_token(refresh_token_raw),
        expires_at=expires_at,
    ))
    await db.commit()

    user_out = UserOut.model_validate(user)
    user_out.roles = roles
    user_out.permissions = permissions

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_raw,
        user=user_out,
    )


@router.post("/logout")
async def logout(
    body: RefreshRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    token_hash = hash_token(body.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    db_token = result.scalar_one_or_none()
    if db_token:
        db_token.revoked = True
    await db.commit()
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return current user with their roles and permissions."""
    roles, permissions = await _load_user_roles_and_permissions(current_user.user_id, db)
    user_out = UserOut.model_validate(current_user)
    user_out.roles = roles
    user_out.permissions = permissions
    return user_out
