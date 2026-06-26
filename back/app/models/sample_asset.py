from sqlalchemy import VARCHAR, INT, TEXT, ForeignKey, Enum, Boolean
from sqlalchemy.dialects.mysql import TINYINT, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SampleAssetManifest(Base):
    __tablename__ = "sample_asset_manifest"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    version: Mapped[str] = mapped_column(VARCHAR(32), nullable=False)
    instrument_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("instrument.id"), nullable=False)

    instrument: Mapped["Instrument"] = relationship(back_populates="sample_manifests")
    assets: Mapped[list["SampleAsset"]] = relationship(back_populates="manifest")
    sessions: Mapped[list["Session"]] = relationship(back_populates="sample_manifest")


class SampleAsset(Base):
    __tablename__ = "sample_asset"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    manifest_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("sample_asset_manifest.id"), nullable=False)
    source_layer: Mapped[str] = mapped_column(Enum("public_asset", "own_asset"), nullable=False)
    file_uri: Mapped[str] = mapped_column(VARCHAR(512), nullable=False)
    license: Mapped[str] = mapped_column(VARCHAR(128), nullable=False)
    attribution: Mapped[str | None] = mapped_column(TEXT, nullable=True)
    base_note_name: Mapped[str] = mapped_column(VARCHAR(16), nullable=False)
    base_pitch_cents: Mapped[int] = mapped_column(INT, nullable=False)
    envelope: Mapped[dict] = mapped_column(JSON, nullable=False)
    quality_flags: Mapped[dict] = mapped_column(JSON, nullable=False)

    manifest: Mapped["SampleAssetManifest"] = relationship(back_populates="assets")
    unit_maps: Mapped[list["InstrumentUnitSampleMap"]] = relationship(back_populates="sample_asset")
    jangdan_assets: Mapped[list["JangdanPresetAsset"]] = relationship(back_populates="sample_asset")


class InstrumentUnitSampleMap(Base):
    __tablename__ = "instrument_unit_sample_map"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    instrument_unit_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("instrument_unit.id"), nullable=False)
    sample_asset_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("sample_asset.id"), nullable=False)
    articulation: Mapped[str] = mapped_column(VARCHAR(64), nullable=False, server_default="pluck")
    priority: Mapped[int] = mapped_column(TINYINT(unsigned=True), nullable=False, server_default="1")
    is_fallback: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")

    unit: Mapped["InstrumentUnit"] = relationship(back_populates="sample_maps")
    sample_asset: Mapped["SampleAsset"] = relationship(back_populates="unit_maps")
