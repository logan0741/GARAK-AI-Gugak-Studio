from scripts.seed import JANGDAN_PRESETS, STALE_JANGDAN_PRESET_IDS


def test_seed_jangdan_presets_match_mvp_vocabulary():
    preset_ids = [preset["id"] for preset in JANGDAN_PRESETS]
    preset_names = [preset["name"] for preset in JANGDAN_PRESETS]

    assert set(preset_ids) == {"semachi", "jungmori", "jajinmori"}
    assert set(preset_names) == {"세마치", "중모리", "자진모리"}
    assert "gutgeori" not in preset_ids
    assert "굿거리" not in preset_names

    medium_preset = next(
        preset for preset in JANGDAN_PRESETS if preset["density_range"] == "medium"
    )
    assert medium_preset["id"] == "semachi"
    assert medium_preset["name"] == "세마치"
    assert medium_preset["min_bpm"] == 80
    assert medium_preset["max_bpm"] == 90


def test_seed_declares_stale_jangdan_presets_for_cleanup():
    preset_ids = {preset["id"] for preset in JANGDAN_PRESETS}

    assert STALE_JANGDAN_PRESET_IDS == ("gutgeori",)
    assert preset_ids.isdisjoint(STALE_JANGDAN_PRESET_IDS)
