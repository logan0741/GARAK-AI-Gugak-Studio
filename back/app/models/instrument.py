from __future__ import annotations
from typing import Optional, List
from sqlalchemy import VARCHAR, INT, UniqueConstraint, ForeignKey, Enum, Boolean
from sqlalchemy.dialects.mysql import TINYINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Instrument(Base):
    __tablename__ = "instrument"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    type: Mapped[str] = mapped_column(Enum("gayageum", "janggu", "daegeum"), nullable=False)
    display_name: Mapped[str] = mapped_column(VARCHAR(128), nullable=False)
    note_unit_count: Mapped[int] = mapped_column(TINYINT(unsigned=True), nullable=False)
    version: Mapped[str] = mapped_column(VARCHAR(32), nullable=False)

    units: Mapped[List["InstrumentUnit"]] = relationship(back_populates="instrument")
    sessions: Mapped[List["Session"]] = relationship(back_populates="instrument")
    sample_manifests: Mapped[List["SampleAssetManifest"]] = relationship(back_populates="instrument")


class InstrumentUnit(Base):
    __tablename__ = "instrument_unit"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    instrument_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("instrument.id"), nullable=False)
    unit_index: Mapped[int] = mapped_column(TINYINT(unsigned=True), nullable=False)
    label: Mapped[str] = mapped_column(VARCHAR(16), nullable=False)
    base_note_name: Mapped[Optional[str]] = mapped_column(VARCHAR(16), nullable=True)
    base_pitch_cents: Mapped[Optional[int]] = mapped_column(INT, nullable=True)
    has_pitch_bend: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")

    instrument: Mapped["Instrument"] = relationship(back_populates="units")
    sample_maps: Mapped[List["InstrumentUnitSampleMap"]] = relationship(back_populates="unit")

    __table_args__ = (
        UniqueConstraint("instrument_id", "unit_index", name="uq_instrument_unit"),
    )
