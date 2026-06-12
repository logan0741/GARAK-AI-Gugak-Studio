from sqlalchemy import VARCHAR, ForeignKey, Enum
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ShareLink(Base):
    __tablename__ = "share_link"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("session.id", ondelete="CASCADE"), nullable=False)
    recording_id: Mapped[str | None] = mapped_column(VARCHAR(64), ForeignKey("recording.id", ondelete="SET NULL"), nullable=True)
    visibility: Mapped[str] = mapped_column(Enum("public", "private"), nullable=False, server_default="public")
    created_at_ms: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)
    expires_at_ms: Mapped[int | None] = mapped_column(BIGINT(unsigned=True), nullable=True)

    session: Mapped["Session"] = relationship(back_populates="share_links")
    recording: Mapped["Recording | None"] = relationship(back_populates="share_links")
