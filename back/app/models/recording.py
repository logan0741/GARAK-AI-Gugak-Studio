from sqlalchemy import VARCHAR, ForeignKey, Enum, Index
from sqlalchemy.dialects.mysql import BIGINT, INTEGER
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Recording(Base):
    __tablename__ = "recording"

    id: Mapped[str] = mapped_column(VARCHAR(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(VARCHAR(64), ForeignKey("session.id", ondelete="CASCADE"), nullable=False)
    file_uri: Mapped[str] = mapped_column(VARCHAR(512), nullable=False)
    format: Mapped[str] = mapped_column(VARCHAR(16), nullable=False, server_default="aac")
    duration_ms: Mapped[int] = mapped_column(INTEGER(unsigned=True), nullable=False, server_default="0")
    render_status: Mapped[str] = mapped_column(
        Enum("pending", "done", "failed"),
        nullable=False,
        server_default="pending",
    )
    created_at_ms: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)

    session: Mapped["Session"] = relationship(back_populates="recordings")
    share_links: Mapped[list["ShareLink"]] = relationship(back_populates="recording")

    __table_args__ = (
        Index("idx_recording_session", "session_id"),
    )
