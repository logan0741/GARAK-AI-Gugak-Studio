from __future__ import annotations

from typing import List, Optional

from sqlalchemy import VARCHAR, ForeignKey, Enum, Index
from sqlalchemy.dialects.mysql import BIGINT, INTEGER, FLOAT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Recording(Base):
    __tablename__ = "recording"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("session.id", ondelete="CASCADE"), nullable=False)
    instrument_id: Mapped[Optional[str]] = mapped_column(VARCHAR(64), ForeignKey("instrument.id", ondelete="SET NULL"), nullable=True)
    file_uri: Mapped[str] = mapped_column(VARCHAR(512), nullable=False)
    format: Mapped[str] = mapped_column(VARCHAR(16), nullable=False, server_default="aac")
    duration_ms: Mapped[int] = mapped_column(INTEGER(unsigned=True), nullable=False, server_default="0")
    render_status: Mapped[str] = mapped_column(
        Enum("pending", "done", "failed"),
        nullable=False,
        server_default="pending",
    )
    volume: Mapped[float] = mapped_column(FLOAT, nullable=False, server_default="1.0")
    is_muted: Mapped[bool] = mapped_column(nullable=False, server_default="0")
    track_order: Mapped[int] = mapped_column(INTEGER(unsigned=True), nullable=False, server_default="0")
    created_at_ms: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)

    session: Mapped["Session"] = relationship(back_populates="recordings")
    instrument: Mapped[Optional["Instrument"]] = relationship()
    share_links: Mapped[List["ShareLink"]] = relationship(back_populates="recording")

    __table_args__ = (
        Index("idx_recording_session", "session_id"),
    )
