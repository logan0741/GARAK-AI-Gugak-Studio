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
      retry: { type: 'practiceAgain' },
      save: { type: 'savePracticeResult' },
      share: { type: 'sharePracticeResult' },
      chooseAnotherSong: { type: 'chooseAnotherSong' },
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
  const aiFeedback = state.practiceAiFeedback;
  const feedbackText =
    aiFeedback?.status === 'ready'
      ? aiFeedback.feedbackText
      : aiFeedback?.status === 'loading'
        ? '연주 데이터를 분석해 AI 피드백을 준비하고 있어요.'
        : feedback.fullText;
  const feedbackTitle =
    aiFeedback?.status === 'ready'
      ? 'AI 피드백'
      : aiFeedback?.status === 'loading'
        ? 'AI 피드백 생성 중'
        : feedback.title;
  const feedbackDescription =
    aiFeedback?.status === 'ready' || aiFeedback?.status === 'loading'
      ? feedbackText
      : feedback.description;

  return {
    songId: evaluation.songId,
    songTitle: getPracticeSongTitle(evaluation.songId),
    instrument: evaluation.instrument,
    instrumentName: getInstrumentName(evaluation.instrument),
    accuracyScore: evaluation.accuracyScore,
    timingScore: evaluation.timingScore,
    feedback: feedbackText,
    feedbackTitle,
    feedbackDescription,
    timingTrendLabel: evaluation.timingTrendLabel,
  };
}
