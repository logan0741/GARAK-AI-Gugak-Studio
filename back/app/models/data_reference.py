from __future__ import annotations

from typing import Dict, List, Optional

from sqlalchemy import VARCHAR, TEXT, ForeignKey, Enum
from sqlalchemy.dialects.mysql import BIGINT, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DataReferenceManifest(Base):
    __tablename__ = "data_reference_manifest"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    version: Mapped[str] = mapped_column(VARCHAR(32), nullable=False)
    usage_scope: Mapped[str] = mapped_column(VARCHAR(128), nullable=False)
    created_at_ms: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)

    references: Mapped[List["DataReference"]] = relationship(back_populates="manifest")


class DataReference(Base):
    __tablename__ = "data_reference"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    manifest_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("data_reference_manifest.id"), nullable=False)
    reference_layer: Mapped[str] = mapped_column(Enum("analysis", "validation", "ux"), nullable=False)
    provider: Mapped[str] = mapped_column(VARCHAR(128), nullable=False)
    dataset_name: Mapped[str] = mapped_column(VARCHAR(256), nullable=False)
    license_note: Mapped[str] = mapped_column(TEXT, nullable=False)
    usage_note: Mapped[str] = mapped_column(TEXT, nullable=False)
    extracted_features: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)

    manifest: Mapped["DataReferenceManifest"] = relationship(back_populates="references")
