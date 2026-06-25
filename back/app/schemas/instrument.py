from pydantic import BaseModel, ConfigDict, Field


class InstrumentUnitOut(BaseModel):
    id: str
    unit_index: int
    label: str
    base_note_name: str | None
    base_pitch_cents: int | None
    has_pitch_bend: bool

    model_config = ConfigDict(from_attributes=True)


class SampleAssetOut(BaseModel):
    id: str
    instrument: str
    string_index: int = Field(serialization_alias="stringIndex")
    file_uri: str = Field(serialization_alias="fileUri")
    source_layer: str = Field(serialization_alias="sourceLayer")
    source_name: str = Field(serialization_alias="sourceName")
    license_note: str = Field(serialization_alias="licenseNote")
    attribution: str | None
    base_pitch_cents: int = Field(serialization_alias="basePitchCents")

    model_config = ConfigDict(populate_by_name=True)


class SampleManifestOut(BaseModel):
    version: str
    assets: list[SampleAssetOut]


class InstrumentOut(BaseModel):
    id: str
    type: str
    display_name: str
    note_unit_count: int
    version: str
    units: list[InstrumentUnitOut]

    model_config = ConfigDict(from_attributes=True)
