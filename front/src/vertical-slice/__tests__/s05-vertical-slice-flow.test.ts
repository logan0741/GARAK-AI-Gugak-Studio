import { describe, expect, test } from 'vitest';
import {
  advanceGarakFlow,
  createInitialGarakFlowState,
  getDefaultInstrumentSettings,
  getInstrumentSlots,
  getPlaySurfaceDescriptor,
} from '../s05-vertical-slice-flow';

describe('GARAK S01-S05 vertical slice flow', () => {
  test('starts as a guest on S01 home with free play selected by default', () => {
    const state = createInitialGarakFlowState();

    expect(state.guestMode).toBe(true);
    expect(state.screen).toBe('home');
    expect(state.selectedMode).toBe('free-play');
    expect(state.homeQuestion).toBe('연주 모드를 선택해요.');
  });

  test('moves from S01 free play to S04 instrument selection', () => {
    const state = advanceGarakFlow(createInitialGarakFlowState(), { type: 'press_next' });

    expect(state.screen).toBe('instrument-selection');
    expect(state.selectedMode).toBe('free-play');
  });

  test('keeps future instruments locked with an update notice', () => {
    const slots = getInstrumentSlots();
    expect(slots.filter((slot) => slot.status === 'available').map((slot) => slot.instrumentId)).toEqual([
      '12_string_gayageum',
      'janggu',
      'daegeum',
    ]);
    expect(slots.filter((slot) => slot.status === 'locked')).toHaveLength(2);

    const state = advanceGarakFlow(
      { ...createInitialGarakFlowState(), screen: 'instrument-selection' },
      { type: 'press_locked_instrument', slotId: 'future-1' },
    );

    expect(state.screen).toBe('instrument-selection');
    expect(state.selectedInstrumentId).toBeUndefined();
    expect(state.notice).toBe('새로운 악기가 업데이트될 예정이에요.');
  });

  test('opens S04A for the selected MVP instrument and starts S05 with default settings', () => {
    const selected = advanceGarakFlow(
      { ...createInitialGarakFlowState(), screen: 'instrument-selection' },
      { type: 'select_instrument', instrumentId: 'janggu' },
    );
    const settings = advanceGarakFlow(selected, { type: 'press_next' });
    const play = advanceGarakFlow(settings, { type: 'start_with_defaults' });

    expect(settings.screen).toBe('instrument-settings');
    expect(settings.selectedInstrumentId).toBe('janggu');
    expect(play.screen).toBe('free-play');
    expect(play.selectedInstrumentId).toBe('janggu');
    expect(play.recordingStatus).toBe('idle');
    expect(play.appliedSettings?.instrumentId).toBe('janggu');
  });

  test('keeps S04A settings instrument-specific instead of showing common labels', () => {
    expect(getDefaultInstrumentSettings('12_string_gayageum').controls.map((control) => control.label)).toEqual([
      '조율',
      '터치 민감도',
      '잔향',
    ]);
    expect(getDefaultInstrumentSettings('janggu').controls.map((control) => control.label)).toEqual([
      '타격 민감도',
      '장단 기준 속도',
      '타격면 표시',
    ]);
    expect(getDefaultInstrumentSettings('daegeum').controls.map((control) => control.label)).toEqual([
      '운지 입력 방식',
      '호흡 입력 민감도',
      '음정 안정 보조',
    ]);
  });

  test('describes a different central play surface for each MVP instrument', () => {
    expect(getPlaySurfaceDescriptor('12_string_gayageum')).toMatchObject({
      type: 'strings',
      stringCount: 12,
    });
    expect(getPlaySurfaceDescriptor('janggu')).toMatchObject({
      type: 'percussion-surfaces',
      surfaces: ['북편', '채편'],
    });
    expect(getPlaySurfaceDescriptor('daegeum')).toMatchObject({
      type: 'breath-and-fingering',
      includesBreathControl: true,
    });
  });

  test('treats any started recording as a take even when it has no performance events', () => {
    const play = {
      ...createInitialGarakFlowState(),
      screen: 'free-play' as const,
      selectedInstrumentId: 'daegeum' as const,
      appliedSettings: getDefaultInstrumentSettings('daegeum'),
    };

    const recording = advanceGarakFlow(play, { type: 'press_record', nowMs: 1000 });
    const takeReady = advanceGarakFlow(recording, { type: 'press_record', nowMs: 1200 });

    expect(recording.recordingStatus).toBe('recording');
    expect(recording.currentTake?.eventCount).toBe(0);
    expect(takeReady.recordingStatus).toBe('take-ready');
    expect(takeReady.currentTake?.durationMs).toBe(200);
  });

  test('allows live playing without recording and counts events only inside the current take', () => {
    const play = {
      ...createInitialGarakFlowState(),
      screen: 'free-play' as const,
      selectedInstrumentId: '12_string_gayageum' as const,
      appliedSettings: getDefaultInstrumentSettings('12_string_gayageum'),
    };

    const liveOnly = advanceGarakFlow(play, {
      type: 'play_surface_input',
      label: '3현',
    });
    const recording = advanceGarakFlow(liveOnly, { type: 'press_record', nowMs: 1000 });
    const recorded = advanceGarakFlow(recording, {
      type: 'play_surface_input',
      label: '5현',
    });

    expect(liveOnly.currentTake).toBeUndefined();
    expect(liveOnly.latestInputLabel).toBe('3현');
    expect(recorded.currentTake?.eventCount).toBe(1);
    expect(recorded.latestInputLabel).toBe('5현');
  });

  test('does not leave S05 when done is pressed without a take', () => {
    const play = {
      ...createInitialGarakFlowState(),
      screen: 'free-play' as const,
      selectedInstrumentId: '12_string_gayageum' as const,
      appliedSettings: getDefaultInstrumentSettings('12_string_gayageum'),
    };

    const state = advanceGarakFlow(play, { type: 'press_done', nowMs: 1000 });

    expect(state.screen).toBe('free-play');
    expect(state.notice).toBe('저장할 테이크가 없어요.');
    expect(state.recordingStatus).toBe('idle');
  });

  test('shows a processing overlay after done and then moves to the S06 placeholder', () => {
    const play = {
      ...createInitialGarakFlowState(),
      screen: 'free-play' as const,
      selectedInstrumentId: 'janggu' as const,
      appliedSettings: getDefaultInstrumentSettings('janggu'),
    };

    const recording = advanceGarakFlow(play, { type: 'press_record', nowMs: 1000 });
    const processing = advanceGarakFlow(recording, { type: 'press_done', nowMs: 1800 });
    const completion = advanceGarakFlow(processing, { type: 'complete_processing' });

    expect(processing.screen).toBe('free-play');
    expect(processing.recordingStatus).toBe('processing');
    expect(processing.processingOverlay).toBe('테이크 정리 중...');
    expect(completion.screen).toBe('completion-placeholder');
  });

  test('opens live jangdan as an S10 bottom panel and guards layer editing without a take', () => {
    const play = {
      ...createInitialGarakFlowState(),
      screen: 'free-play' as const,
      selectedInstrumentId: '12_string_gayageum' as const,
      appliedSettings: getDefaultInstrumentSettings('12_string_gayageum'),
    };

    const jangdan = advanceGarakFlow(play, { type: 'open_jangdan_panel' });
    const blockedLayer = advanceGarakFlow(play, { type: 'open_layer_edit' });
    const takeReady = advanceGarakFlow(
      advanceGarakFlow(play, { type: 'press_record', nowMs: 1000 }),
      { type: 'press_record', nowMs: 1100 },
    );
    const layerPlaceholder = advanceGarakFlow(takeReady, { type: 'open_layer_edit' });

    expect(jangdan.screen).toBe('free-play');
    expect(jangdan.jangdanPanelOpen).toBe(true);
    expect(blockedLayer.screen).toBe('free-play');
    expect(blockedLayer.notice).toBe('먼저 녹음한 뒤 레이어 편집을 할 수 있어요.');
    expect(layerPlaceholder.screen).toBe('layer-edit-placeholder');
  });

  test('does not open layer editing while a take is still recording', () => {
    const play = {
      ...createInitialGarakFlowState(),
      screen: 'free-play' as const,
      selectedInstrumentId: 'janggu' as const,
      appliedSettings: getDefaultInstrumentSettings('janggu'),
    };

    const recording = advanceGarakFlow(play, { type: 'press_record', nowMs: 1000 });
    const blockedLayer = advanceGarakFlow(recording, { type: 'open_layer_edit' });

    expect(blockedLayer.screen).toBe('free-play');
    expect(blockedLayer.recordingStatus).toBe('recording');
    expect(blockedLayer.notice).toBe('녹음을 중지한 뒤 레이어 편집을 할 수 있어요.');
  });
});
