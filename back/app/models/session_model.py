from sqlalchemy import VARCHAR, ForeignKey, Index
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
    schema_version: Mapped[str] = mapped_column(VARCHAR(32), nullable=False, server_default="2026.06.mvp")
    duration_ms: Mapped[int] = mapped_column(INTEGER(unsigned=True), nullable=False, server_default="0")
    replay_settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at_ms: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)
    updated_at_ms: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)

    instrument: Mapped["Instrument"] = relationship(back_populates="sessions")
    sample_manifest: Mapped["SampleAssetManifest"] = relationship(back_populates="sessions")
    events: Mapped[list["PerformanceEvent"]] = relationship(back_populates="session")
    recordings: Mapped[list["Recording"]] = relationship(back_populates="session")
    jangdan_recommendations: Mapped[list["JangdanRecommendation"]] = relationship(back_populates="session")
    share_links: Mapped[list["ShareLink"]] = relationship(back_populates="session")

    __table_args__ = (
        Index("idx_session_user", "user_id"),
        Index("idx_session_created", "created_at_ms"),
    )
