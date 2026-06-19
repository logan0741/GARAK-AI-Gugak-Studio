from pydantic import BaseModel, ConfigDict


class InstrumentUnitOut(BaseModel):
    id: str
    unit_index: int
    label: str
    base_note_name: str | None
    base_pitch_cents: int | None
    has_pitch_bend: bool

    model_config = ConfigDict(from_attributes=True)


class InstrumentOut(BaseModel):
    id: str
    type: str
    display_name: str
    note_unit_count: int
    version: str
    units: list[InstrumentUnitOut]

    model_config = ConfigDict(from_attributes=True)
