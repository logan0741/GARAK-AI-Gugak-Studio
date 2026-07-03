from __future__ import annotations
from typing import Optional
from sqlalchemy import VARCHAR, ForeignKey, Enum, Index, Float
from sqlalchemy.dialects.mysql import TINYINT, SMALLINT, BIGINT, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PerformanceEvent(Base):
    __tablename__ = "performance_event"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        VARCHAR(64), ForeignKey("session.id", ondelete="CASCADE"), nullable=False
    )
    occurred_at_ms: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)
    event_type: Mapped[str] = mapped_column(
        Enum("string_pluck", "string_bend", "string_mute", "glissando_step", "string_release"),
        nullable=False,
    )
    unit_index: Mapped[Optional[int]] = mapped_column(TINYINT(unsigned=True), nullable=True)
    pitch_bend_cents: Mapped[Optional[int]] = mapped_column(SMALLINT, nullable=True)
    velocity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    strength: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    session: Mapped["Session"] = relationship(back_populates="events")

    __table_args__ = (
        Index("idx_event_session", "session_id"),
        Index("idx_event_time", "session_id", "occurred_at_ms"),
    )
