from __future__ import annotations

from typing import Dict, List

from sqlalchemy import VARCHAR, ForeignKey, Enum
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FolkSong(Base):
    __tablename__ = "folk_song"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    title: Mapped[str] = mapped_column(VARCHAR(256), nullable=False)
    instrument_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("instrument.id"), nullable=False)
    # 기준 연주 이벤트 배열 — 따라하기 채점 기준
    reference_events: Mapped[Dict] = mapped_column(JSON, nullable=False)
    difficulty: Mapped[str] = mapped_column(
        Enum("easy", "medium", "hard"),
        nullable=False,
        server_default="medium",
    )

    instrument: Mapped["Instrument"] = relationship()
    sessions: Mapped[List["Session"]] = relationship(back_populates="folk_song")
