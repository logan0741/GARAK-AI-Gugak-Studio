from __future__ import annotations

from typing import Dict, List, Optional

from sqlalchemy import VARCHAR, TEXT, ForeignKey, Enum, Index, Float
from sqlalchemy.dialects.mysql import SMALLINT, TINYINT, INTEGER, BIGINT, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class JangdanPreset(Base):
    __tablename__ = "jangdan_preset"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    name: Mapped[str] = mapped_column(VARCHAR(64), nullable=False)
    min_bpm: Mapped[int] = mapped_column(SMALLINT(unsigned=True), nullable=False)
    max_bpm: Mapped[int] = mapped_column(SMALLINT(unsigned=True), nullable=False)
    density_range: Mapped[str] = mapped_column(Enum("low", "medium", "high", "any"), nullable=False)
    meter: Mapped[str] = mapped_column(VARCHAR(32), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(TEXT, nullable=True)

    pattern_events: Mapped[List["JangdanPatternEvent"]] = relationship(back_populates="preset")
    preset_assets: Mapped[List["JangdanPresetAsset"]] = relationship(back_populates="preset")
    recommendations: Mapped[List["JangdanRecommendation"]] = relationship(back_populates="preset")


class JangdanPatternEvent(Base):
    __tablename__ = "jangdan_pattern_event"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    jangdan_preset_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("jangdan_preset.id"), nullable=False)
    step_index: Mapped[int] = mapped_column(TINYINT(unsigned=True), nullable=False)
    offset_ms: Mapped[int] = mapped_column(INTEGER(unsigned=True), nullable=False)
    percussion_slot: Mapped[str] = mapped_column(VARCHAR(32), nullable=False)
    velocity: Mapped[float] = mapped_column(Float, nullable=False)

    preset: Mapped["JangdanPreset"] = relationship(back_populates="pattern_events")

    __table_args__ = (
        Index("idx_pattern_preset", "jangdan_preset_id"),
    )


class JangdanPresetAsset(Base):
    __tablename__ = "jangdan_preset_asset"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    jangdan_preset_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("jangdan_preset.id"), nullable=False)
    sample_asset_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("sample_asset.id"), nullable=False)
    percussion_slot: Mapped[str] = mapped_column(VARCHAR(32), nullable=False)

    preset: Mapped["JangdanPreset"] = relationship(back_populates="preset_assets")
    sample_asset: Mapped["SampleAsset"] = relationship(back_populates="jangdan_assets")


class JangdanRecommendation(Base):
    __tablename__ = "jangdan_recommendation"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("session.id", ondelete="CASCADE"), nullable=False)
    jangdan_preset_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("jangdan_preset.id"), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    estimated_bpm: Mapped[int] = mapped_column(SMALLINT(unsigned=True), nullable=False)
    density: Mapped[float] = mapped_column(Float, nullable=False)
    beat_stability: Mapped[float] = mapped_column(Float, nullable=False)
    decision_status: Mapped[str] = mapped_column(
        Enum("proposed", "previewed", "accepted", "rejected"),
        nullable=False,
        server_default="proposed",
    )
    reason: Mapped[Dict] = mapped_column(JSON, nullable=False)
    created_at_ms: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)
    accepted_at_ms: Mapped[Optional[int]] = mapped_column(BIGINT(unsigned=True), nullable=True)

    session: Mapped["Session"] = relationship(back_populates="jangdan_recommendations")
    preset: Mapped["JangdanPreset"] = relationship(back_populates="recommendations")

    __table_args__ = (
        Index("idx_recommendation_session", "session_id"),
    )
