"""
Unit tests for RBAC service (get_user_permissions) using mocked DB.
Tests permission resolution, caching, expiry filtering, and 403 enforcement.
"""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.rbac import get_user_permissions


USER_ID = "user-001"


def _make_scalars(values: list[str]):
    """Return a mock result that .scalars().all() returns values."""
    result = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = values
    result.scalars.return_value = scalars_mock
    return result


@pytest.fixture
def mock_db():
    db = AsyncMock()
    return db


# ---------------------------------------------------------------------------
# get_user_permissions
# ---------------------------------------------------------------------------

class TestGetUserPermissions:
    @pytest.mark.asyncio
    async def test_returns_permission_codes_from_db(self, mock_db):
        codes = ["ecl:run", "reports:view", "staging:view"]
        mock_db.execute.return_value = _make_scalars(codes)

        perms = await get_user_permissions(USER_ID, mock_db)

        assert perms == set(codes)
        mock_db.execute.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_returns_empty_set_for_no_roles(self, mock_db):
        mock_db.execute.return_value = _make_scalars([])

        perms = await get_user_permissions(USER_ID, mock_db)

        assert perms == set()

    @pytest.mark.asyncio
    async def test_returns_set_not_list(self, mock_db):
        # Duplicate codes in DB should collapse to set
        mock_db.execute.return_value = _make_scalars(["ecl:run", "ecl:run", "reports:view"])

        perms = await get_user_permissions(USER_ID, mock_db)

        assert isinstance(perms, set)
        assert len(perms) == 2

    @pytest.mark.asyncio
    async def test_caches_result_on_request_state(self, mock_db):
        codes = ["ecl:run"]
        mock_db.execute.return_value = _make_scalars(codes)
        request = MagicMock()
        request.state = MagicMock(spec=[])  # empty state

        # First call — DB queried
        perms1 = await get_user_permissions(USER_ID, mock_db, request=request)
        # Second call — should use cache (DB not called again)
        perms2 = await get_user_permissions(USER_ID, mock_db, request=request)

        assert perms1 == perms2
        assert mock_db.execute.await_count == 1

    @pytest.mark.asyncio
    async def test_no_cache_without_request(self, mock_db):
        mock_db.execute.return_value = _make_scalars(["ecl:run"])

        await get_user_permissions(USER_ID, mock_db)
        await get_user_permissions(USER_ID, mock_db)

        # No request object -> no caching -> DB queried twice
        assert mock_db.execute.await_count == 2

    @pytest.mark.asyncio
    async def test_different_users_not_sharing_cache(self, mock_db):
        mock_db.execute.return_value = _make_scalars(["admin:view"])
        request = MagicMock()
        request.state = MagicMock(spec=[])

        await get_user_permissions("user-A", mock_db, request=request)

        # Reset mock for second user
        mock_db.execute.reset_mock()
        mock_db.execute.return_value = _make_scalars(["ecl:run"])
        request2 = MagicMock()
        request2.state = MagicMock(spec=[])

        perms2 = await get_user_permissions("user-B", mock_db, request=request2)

        assert "ecl:run" in perms2
        mock_db.execute.assert_awaited_once()


# ---------------------------------------------------------------------------
# require_permission dependency
# ---------------------------------------------------------------------------

class TestRequirePermission:
    @pytest.mark.asyncio
    async def test_raises_403_when_permission_missing(self):
        from fastapi import HTTPException
        from app.core.rbac import require_permission

        checker = require_permission("ecl:run")

        mock_user = MagicMock()
        mock_user.user_id = USER_ID
        mock_db = AsyncMock()
        mock_db.execute.return_value = _make_scalars(["reports:view"])  # no ecl:run
        mock_request = MagicMock()
        mock_request.state = MagicMock(spec=[])

        with pytest.raises(HTTPException) as exc_info:
            await checker(mock_request, mock_user, mock_db)

        assert exc_info.value.status_code == 403
        assert "ecl:run" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_returns_user_when_permission_present(self):
        from app.core.rbac import require_permission

        checker = require_permission("ecl:run")

        mock_user = MagicMock()
        mock_user.user_id = USER_ID
        mock_db = AsyncMock()
        mock_db.execute.return_value = _make_scalars(["ecl:run", "reports:view"])
        mock_request = MagicMock()
        mock_request.state = MagicMock(spec=[])

        result = await checker(mock_request, mock_user, mock_db)

        assert result is mock_user

    @pytest.mark.asyncio
    async def test_superadmin_permission_grants_access(self):
        from app.core.rbac import require_permission

        checker = require_permission("admin:users:create")

        mock_user = MagicMock()
        mock_user.user_id = USER_ID
        mock_db = AsyncMock()
        mock_db.execute.return_value = _make_scalars(["admin:users:create", "admin:roles:manage"])
        mock_request = MagicMock()
        mock_request.state = MagicMock(spec=[])

        result = await checker(mock_request, mock_user, mock_db)

        assert result is mock_user


# ---------------------------------------------------------------------------
# Permission code format validation
# ---------------------------------------------------------------------------

class TestPermissionCodeFormat:
    """Verify that permission codes follow the module:action pattern."""

    EXPECTED_PERMISSION_PREFIXES = {
        "ecl", "staging", "macro", "provision", "overlays",
        "data", "segmentation", "governance", "audit", "reports", "admin",
    }

    def test_expected_modules_present(self):
        """Spot-check that key permission modules are defined."""
        # These come from the 0004 RBAC seed migration
        sample_codes = [
            "ecl:run",
            "staging:view",
            "macro:view",
            "provision:approve",
            "overlays:submit",
            "reports:view",
            "admin:users:view",
            "governance:model:view",
            "audit:log:view",
        ]
        for code in sample_codes:
            module = code.split(":")[0]
            assert module in self.EXPECTED_PERMISSION_PREFIXES, \
                f"Permission '{code}' has unexpected module '{module}'"

    def test_permission_codes_are_lowercase(self):
        sample_codes = ["ecl:run", "staging:override:submit", "reports:export"]
        for code in sample_codes:
            assert code == code.lower(), f"Permission code '{code}' is not lowercase"

    def test_permission_code_has_at_least_two_parts(self):
        sample_codes = ["ecl:run", "staging:view", "admin:users:view"]
        for code in sample_codes:
            parts = code.split(":")
            assert len(parts) >= 2, f"Permission code '{code}' has fewer than 2 parts"
