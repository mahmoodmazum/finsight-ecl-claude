"""Admin router — user and role management.

All endpoints require admin:* permissions.
Every mutation writes to audit_log.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.core.dependencies import get_db
from app.core.rbac import require_permission
from app.core.exceptions import NotFoundException
from app.core.audit import write_audit_event
from app.auth.models import User
from app.auth.service import hash_password
from app.models.rbac import Role, Permission, RolePermission, UserRole

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PermissionOut(BaseModel):
    permission_id: str
    code: str
    name: str
    description: Optional[str] = None
    module: str
    action: str
    model_config = {"from_attributes": True}


class RoleOut(BaseModel):
    role_id: str
    name: str
    description: Optional[str] = None
    is_system: bool
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class RoleWithPerms(RoleOut):
    permissions: list[PermissionOut] = []


class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class RolePermissionsUpdate(BaseModel):
    permission_ids: list[str]


class UserAdminOut(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    roles: list[str] = []
    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "VIEWER"

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        if v not in ("ADMIN", "CRO", "ANALYST", "VIEWER"):
            raise ValueError("role must be ADMIN, CRO, ANALYST, or VIEWER")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserRoleAssign(BaseModel):
    role_id: str
    expires_at: Optional[datetime] = None


class UserPage(BaseModel):
    items: list[UserAdminOut]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

async def _user_role_names(user_id: str, db: AsyncSession) -> list[str]:
    result = await db.execute(
        select(Role.name)
        .join(UserRole, Role.role_id == UserRole.role_id)
        .where(UserRole.user_id == user_id)
    )
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------

@router.get("/permissions", response_model=dict[str, list[PermissionOut]])
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:roles:view")),
):
    """Return all permissions grouped by module."""
    result = await db.execute(
        select(Permission).order_by(Permission.module, Permission.code)
    )
    grouped: dict[str, list[PermissionOut]] = {}
    for p in result.scalars():
        grouped.setdefault(p.module, []).append(PermissionOut.model_validate(p))
    return grouped


# ---------------------------------------------------------------------------
# Roles
# ---------------------------------------------------------------------------

@router.get("/roles", response_model=list[RoleOut])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:roles:view")),
):
    result = await db.execute(select(Role).order_by(Role.name))
    return result.scalars().all()


@router.post("/roles", response_model=RoleOut, status_code=201)
async def create_role(
    body: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:roles:create")),
):
    existing = await db.execute(select(Role).where(Role.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Role '{body.name}' already exists")

    role = Role(
        role_id=str(uuid.uuid4()),
        name=body.name,
        description=body.description,
        is_system=False,
        is_active=True,
        created_by=current_user.user_id,
    )
    db.add(role)
    await write_audit_event(db, "ROLE_CREATE", "role", role.role_id, current_user.user_id,
                            after_state={"name": role.name})
    await db.commit()
    await db.refresh(role)
    return role


@router.put("/roles/{role_id}", response_model=RoleOut)
async def update_role(
    role_id: str,
    body: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:roles:edit")),
):
    result = await db.execute(select(Role).where(Role.role_id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise NotFoundException(f"Role {role_id} not found")
    if role.is_system:
        raise HTTPException(status_code=403, detail="System roles cannot be modified")

    before = {"name": role.name, "description": role.description}
    if body.name is not None:
        role.name = body.name
    if body.description is not None:
        role.description = body.description
    if body.is_active is not None:
        role.is_active = body.is_active

    await write_audit_event(db, "ROLE_UPDATE", "role", role_id, current_user.user_id,
                            before_state=before, after_state={"name": role.name})
    await db.commit()
    await db.refresh(role)
    return role


@router.delete("/roles/{role_id}", status_code=204)
async def delete_role(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:roles:delete")),
):
    result = await db.execute(select(Role).where(Role.role_id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise NotFoundException(f"Role {role_id} not found")
    if role.is_system:
        raise HTTPException(status_code=403, detail="System roles cannot be deleted")

    # Check no users assigned
    count_result = await db.execute(
        select(func.count()).where(UserRole.role_id == role_id)
    )
    if count_result.scalar_one() > 0:
        raise HTTPException(status_code=409, detail="Cannot delete role with assigned users")

    await db.execute(delete(RolePermission).where(RolePermission.role_id == role_id))
    await db.execute(delete(Role).where(Role.role_id == role_id))
    await write_audit_event(db, "ROLE_DELETE", "role", role_id, current_user.user_id,
                            before_state={"name": role.name})
    await db.commit()


@router.get("/roles/{role_id}/permissions", response_model=list[PermissionOut])
async def get_role_permissions(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:roles:view")),
):
    result = await db.execute(
        select(Permission)
        .join(RolePermission, Permission.permission_id == RolePermission.permission_id)
        .where(RolePermission.role_id == role_id)
        .order_by(Permission.module, Permission.code)
    )
    return result.scalars().all()


@router.post("/roles/{role_id}/permissions", response_model=list[PermissionOut])
async def set_role_permissions(
    role_id: str,
    body: RolePermissionsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:roles:permissions")),
):
    """Replace the entire permission set for a role."""
    result = await db.execute(select(Role).where(Role.role_id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise NotFoundException(f"Role {role_id} not found")

    # Validate all permission IDs exist
    if body.permission_ids:
        check = await db.execute(
            select(func.count()).where(Permission.permission_id.in_(body.permission_ids))
        )
        if check.scalar_one() != len(body.permission_ids):
            raise HTTPException(status_code=422, detail="One or more permission IDs not found")

    # Replace
    await db.execute(delete(RolePermission).where(RolePermission.role_id == role_id))
    now = datetime.now(timezone.utc)
    for pid in body.permission_ids:
        db.add(RolePermission(
            role_id=role_id,
            permission_id=pid,
            granted_at=now,
            granted_by=current_user.user_id,
        ))

    await write_audit_event(db, "ROLE_PERMISSIONS_UPDATE", "role", role_id, current_user.user_id,
                            after_state={"permission_count": len(body.permission_ids)})
    await db.commit()

    return await get_role_permissions(role_id, db, current_user)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@router.get("/users", response_model=UserPage)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:users:view")),
):
    q = select(User)
    if search:
        like = f"%{search}%"
        q = q.where(User.email.like(like) | User.full_name.like(like))
    if is_active is not None:
        q = q.where(User.is_active == is_active)

    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        q.order_by(User.full_name).offset((page - 1) * page_size).limit(page_size)
    )
    users = result.scalars().all()

    items = []
    for u in users:
        out = UserAdminOut.model_validate(u)
        out.roles = await _user_role_names(u.user_id, db)
        items.append(out)

    return UserPage(items=items, total=total, page=page, page_size=page_size)


@router.post("/users", response_model=UserAdminOut, status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:users:create")),
):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        user_id=str(uuid.uuid4()),
        email=body.email,
        full_name=body.full_name,
        password_hash=hash_password(body.password),
        role=body.role,
        is_active=True,
        created_by=current_user.user_id,
    )
    db.add(user)
    await db.flush()

    await write_audit_event(db, "USER_CREATE", "user", user.user_id, current_user.user_id,
                            after_state={"email": user.email, "role": user.role})
    await db.commit()
    await db.refresh(user)

    out = UserAdminOut.model_validate(user)
    out.roles = await _user_role_names(user.user_id, db)
    return out


@router.put("/users/{user_id}", response_model=UserAdminOut)
async def update_user(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:users:edit")),
):
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException(f"User {user_id} not found")

    before = {"full_name": user.full_name, "email": user.email}
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.email is not None:
        user.email = body.email

    await write_audit_event(db, "USER_UPDATE", "user", user_id, current_user.user_id,
                            before_state=before,
                            after_state={"full_name": user.full_name, "email": user.email})
    await db.commit()
    await db.refresh(user)

    out = UserAdminOut.model_validate(user)
    out.roles = await _user_role_names(user.user_id, db)
    return out


@router.post("/users/{user_id}/deactivate", status_code=200)
async def deactivate_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:users:deactivate")),
):
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException(f"User {user_id} not found")
    user.is_active = False
    await write_audit_event(db, "USER_DEACTIVATE", "user", user_id, current_user.user_id)
    await db.commit()
    return {"message": "User deactivated"}


@router.post("/users/{user_id}/activate", status_code=200)
async def activate_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:users:deactivate")),
):
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException(f"User {user_id} not found")
    user.is_active = True
    await write_audit_event(db, "USER_ACTIVATE", "user", user_id, current_user.user_id)
    await db.commit()
    return {"message": "User activated"}


@router.get("/users/{user_id}/roles", response_model=list[str])
async def get_user_roles(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:users:view")),
):
    return await _user_role_names(user_id, db)


@router.post("/users/{user_id}/roles", status_code=201)
async def assign_role_to_user(
    user_id: str,
    body: UserRoleAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:users:roles")),
):
    # Verify user + role exist
    u = (await db.execute(select(User).where(User.user_id == user_id))).scalar_one_or_none()
    if not u:
        raise NotFoundException(f"User {user_id} not found")
    r = (await db.execute(select(Role).where(Role.role_id == body.role_id))).scalar_one_or_none()
    if not r:
        raise NotFoundException(f"Role {body.role_id} not found")

    existing = (await db.execute(
        select(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == body.role_id)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="User already has this role")

    db.add(UserRole(
        user_id=user_id,
        role_id=body.role_id,
        assigned_by=current_user.user_id,
        expires_at=body.expires_at,
    ))
    await write_audit_event(db, "USER_ROLE_ASSIGN", "user_role", f"{user_id}:{body.role_id}",
                            current_user.user_id,
                            after_state={"role": r.name, "expires_at": str(body.expires_at)})
    await db.commit()
    return {"message": f"Role '{r.name}' assigned to user"}


@router.delete("/users/{user_id}/roles/{role_id}", status_code=204)
async def remove_role_from_user(
    user_id: str,
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("admin:users:roles")),
):
    result = await db.execute(
        select(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == role_id)
    )
    ur = result.scalar_one_or_none()
    if not ur:
        raise NotFoundException("User does not have this role")
    await db.delete(ur)
    await write_audit_event(db, "USER_ROLE_REMOVE", "user_role", f"{user_id}:{role_id}",
                            current_user.user_id)
    await db.commit()
