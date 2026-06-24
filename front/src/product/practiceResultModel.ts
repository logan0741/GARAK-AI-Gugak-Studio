import type { InstrumentId } from '../studio/studioTypes';
import type { GarakProductAction, GarakProductState } from './garakProductState';
import { buildPracticeResultFeedback, evaluatePracticeResult } from './practiceResultEvaluation';
import { getInstrumentName, getPracticeSongTitle } from './productFixtures';

export type PracticeResultDraft = {
  songId: string;
  songTitle: string;
  instrument: InstrumentId;
  instrumentName: string;
  accuracyScore: number;
  timingScore: number;
  feedback: string;
  feedbackTitle: string;
  feedbackDescription: string;
  timingTrendLabel: string;
};

export type PracticeResultModel = PracticeResultDraft & {
  accuracyScoreLabel: string;
  timingScoreLabel: string;
  actions: {
    retry: GarakProductAction;
    save: GarakProductAction;
    share: GarakProductAction;
    chooseAnotherSong: GarakProductAction;
  };
};

export function getPracticeResultModel(state: GarakProductState): PracticeResultModel {
  const draft = buildPracticeResultDraft(state);

  return {
    ...draft,
    accuracyScoreLabel: String(draft.accuracyScore),
    timingScoreLabel: `${draft.timingScore}%`,
    actions: {
      retry: { type: 'navigate', target: 'S15' },
      save: { type: 'savePracticeResult' },
      share: { type: 'sharePracticeResult' },
      chooseAnotherSong: { type: 'navigate', target: 'S13' },
    },
  };
}

export function buildPracticeResultDraft(state: GarakProductState): PracticeResultDraft {
  const evaluation = evaluatePracticeResult({
    practiceAttempt: state.practiceAttempt,
    selectedPracticeSongId: state.selectedPracticeSongId,
    selectedInstrument: state.selectedInstrument,
  });
  const feedback = buildPracticeResultFeedback(evaluation);

  return {
    songId: evaluation.songId,
    songTitle: getPracticeSongTitle(evaluation.songId),
    instrument: evaluation.instrument,
    instrumentName: getInstrumentName(evaluation.instrument),
    accuracyScore: evaluation.accuracyScore,
    timingScore: evaluation.timingScore,
    feedback: feedback.fullText,
    feedbackTitle: feedback.title,
    feedbackDescription: feedback.description,
    timingTrendLabel: evaluation.timingTrendLabel,
  };
}
