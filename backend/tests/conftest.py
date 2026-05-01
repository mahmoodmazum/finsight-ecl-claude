"""pytest configuration — keeps engine tests isolated from DB."""
import pytest


# Ensure pytest-asyncio mode is set for any async tests added later
def pytest_configure(config):
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )
