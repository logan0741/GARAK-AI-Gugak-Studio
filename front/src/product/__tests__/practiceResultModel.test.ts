import { expect, test } from 'vitest';

import { createStringPluck } from '../../domain/performanceEvent';
import { createInitialGarakProductState } from '../garakProductState';
import { evaluatePracticeResult } from '../practiceResultEvaluation';
import { getPracticeResultModel } from '../practiceResultModel';

test('builds S16 practice feedback from the completed practice attempt', () => {
  const inputEvents = Array.from({ length: 6 }, (_, index) =>
    createStringPluck({
      tsMs: index * 520,
      stringIndex: index + 1,
      velocity: 0.7,
    }),
  );
  const state = {
    ...createInitialGarakProductState(),
    selectedPracticeSongId: 'doraji' as const,
    selectedInstrument: 'daegeum' as const,
    practiceAttempt: {
      songId: 'doraji' as const,
      instrument: 'daegeum' as const,
      status: 'completed' as const,
      inputEvents,
      timingErrorsMs: [12, -18, 30],
      startedAt: '2026-06-18T00:00:00.000Z',
      completedAt: '2026-06-18T00:00:30.000Z',
    },
  };

  expect(getPracticeResultModel(state)).toMatchObject({
    songTitle: '도라지',
    instrumentName: '대금',
    accuracyScore: 95,
    accuracyScoreLabel: '95',
    timingScore: 84,
    feedbackTitle: '정확한 흐름이에요.',
    feedback: '정확한 흐름이에요. 박자 오차 평균 20ms로 안정적인 연습 결과입니다.',
    timingTrendLabel: '박자 오차 평균 20ms',
  });
  expect(
    evaluatePracticeResult({
      practiceAttempt: state.practiceAttempt,
      selectedPracticeSongId: state.selectedPracticeSongId,
      selectedInstrument: state.selectedInstrument,
    }).resultKind,
  ).toBe('attemptEvidence');
});

test('exposes connected S16 result actions without direct navigation fallbacks', () => {
  expect(getPracticeResultModel(createInitialGarakProductState()).actions).toEqual({
    retry: { type: 'practiceAgain' },
    save: { type: 'savePracticeResult' },
    share: { type: 'sharePracticeResult' },
    chooseAnotherSong: { type: 'chooseAnotherSong' },
  });
});

test('reports missing evidence when no practice input was captured', () => {
  const state = {
    ...createInitialGarakProductState(),
    selectedPracticeSongId: 'arirang' as const,
    selectedInstrument: 'gayageum' as const,
    practiceAttempt: {
      songId: 'arirang' as const,
      instrument: 'gayageum' as const,
      status: 'completed' as const,
      inputEvents: [],
      timingErrorsMs: [],
      startedAt: '2026-06-18T00:00:00.000Z',
      completedAt: '2026-06-18T00:00:30.000Z',
    },
  };

  expect(getPracticeResultModel(state)).toMatchObject({
    accuracyScore: 0,
    timingScore: 0,
    feedback: '연주 입력이 기록되지 않았어요.',
    timingTrendLabel: '기록된 연주 입력 없음',
  });
  expect(
    evaluatePracticeResult({
      practiceAttempt: state.practiceAttempt,
      selectedPracticeSongId: state.selectedPracticeSongId,
      selectedInstrument: state.selectedInstrument,
    }).resultKind,
  ).toBe('localTemplate');
});
