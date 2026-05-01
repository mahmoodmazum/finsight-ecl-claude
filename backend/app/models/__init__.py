# Import all models here so they are registered with SQLAlchemy Base metadata
# and Alembic can detect them for migrations.

from app.auth.models import User, RefreshToken  # noqa
from app.models.segment import Segment  # noqa
from app.models.data_source import DataSource, DataLoadHistory, DataQualityIssue  # noqa
from app.models.loan import LoanAccount, Collateral  # noqa
from app.models.staging import StagingResult, PDParameter, TransitionMatrix, LGDParameter  # noqa
from app.models.macro import MacroScenario  # noqa
from app.models.provision import ProvisionRun, ProvisionMovement, GLEntry  # noqa
from app.models.ecl import ECLResult  # noqa
from app.models.overlay import ManagementOverlay  # noqa
from app.models.audit import RiskRegister  # noqa
from app.models.model_governance import MLModel  # noqa
from app.models.rbac import Permission, Role, RolePermission, UserRole  # noqa
