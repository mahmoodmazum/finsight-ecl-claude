import json
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


async def write_audit_event(
    db: AsyncSession,
    event_type: str,
    entity_type: str,
    entity_id: str,
    user_id: str,
    user_ip: str = None,
    before_state: dict = None,
    after_state: dict = None,
    notes: str = None,
) -> None:
    """Write an immutable audit log entry. Uses raw INSERT to bypass ORM hooks."""
    await db.execute(
        text(
            """
            INSERT INTO audit_log (
                event_type, entity_type, entity_id, user_id, user_ip,
                before_state, after_state, event_at, notes
            ) VALUES (
                :event_type, :entity_type, :entity_id, :user_id, :user_ip,
                :before_state, :after_state, :event_at, :notes
            )
            """
        ),
        {
            "event_type": event_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "user_id": user_id,
            "user_ip": user_ip,
            "before_state": json.dumps(before_state) if before_state else None,
            "after_state": json.dumps(after_state) if after_state else None,
            "event_at": datetime.now(timezone.utc),
            "notes": notes,
        },
    )
