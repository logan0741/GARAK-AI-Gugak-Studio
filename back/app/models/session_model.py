from __future__ import annotations

from typing import Dict, List, Optional

from sqlalchemy import VARCHAR, ForeignKey, Index, Enum
from sqlalchemy.dialects.mysql import BIGINT, INTEGER, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Session(Base):
    __tablename__ = "session"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(VARCHAR(128), nullable=False)
    instrument_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("instrument.id"), nullable=False)
    sample_asset_manifest_id: Mapped[str] = mapped_column(
        VARCHAR(64), ForeignKey("sample_asset_manifest.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(VARCHAR(256), nullable=False)
    # creative: 자유창작모드, practice: 따라하기모드
    mode: Mapped[str] = mapped_column(
        Enum("creative", "practice"),
        nullable=False,
        server_default="creative",
    )
    # 따라하기모드 전용. 어떤 민요를 연습했는지 (creative 모드에서는 NULL)
    folk_song_id: Mapped[Optional[str]] = mapped_column(
        VARCHAR(64), ForeignKey("folk_song.id", ondelete="SET NULL"), nullable=True
    )
    schema_version: Mapped[str] = mapped_column(VARCHAR(32), nullable=False, server_default="2026.06.mvp")
    duration_ms: Mapped[int] = mapped_column(INTEGER(unsigned=True), nullable=False, server_default="0")
    replay_settings: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    created_at_ms: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)
    updated_at_ms: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)

    instrument: Mapped["Instrument"] = relationship(back_populates="sessions")
    sample_manifest: Mapped["SampleAssetManifest"] = relationship(back_populates="sessions")
    folk_song: Mapped[Optional["FolkSong"]] = relationship(back_populates="sessions")
    events: Mapped[List["PerformanceEvent"]] = relationship(back_populates="session")
    recordings: Mapped[List["Recording"]] = relationship(back_populates="session")
    jangdan_recommendations: Mapped[List["JangdanRecommendation"]] = relationship(back_populates="session")
    share_links: Mapped[List["ShareLink"]] = relationship(back_populates="session")

    __table_args__ = (
        Index("idx_session_user", "user_id"),
        Index("idx_session_created", "created_at_ms"),
    )
