import type { PerformanceEvent } from '../domain/performanceEvent';
import type { InstrumentId } from '../studio/studioTypes';
import type { PracticeSong } from './productFixtures';

export type PracticeResultAttemptInput = {
  songId: PracticeSong['id'];
  instrument: InstrumentId;
  inputEvents: PerformanceEvent[];
  timingErrorsMs: number[];
};

export type PracticeResultEvaluationInput = {
  practiceAttempt?: PracticeResultAttemptInput;
  selectedPracticeSongId?: PracticeSong['id'];
  selectedInstrument?: InstrumentId;
};

export type PracticeResultKind = 'localTemplate' | 'attemptEvidence';

export type PracticeResultEvaluation = {
  songId: PracticeSong['id'];
  instrument: InstrumentId;
  accuracyScore: number;
  timingScore: number;
  timingTrendLabel: string;
  resultKind: PracticeResultKind;
};

export type PracticeResultFeedback = {
  title: string;
  description: string;
  fullText: string;
};

const EXPECTED_GUIDE_INPUT_COUNT = 6;
const LOCAL_TEMPLATE_ACCURACY_SCORE = 82;
const LOCAL_TEMPLATE_TIMING_SCORE = 78;
const LOCAL_TEMPLATE_FEEDBACK = '박자 흐름이 안정적이에요.';

export function evaluatePracticeResult({
  practiceAttempt,
  selectedPracticeSongId,
  selectedInstrument,
}: PracticeResultEvaluationInput): PracticeResultEvaluation {
  const songId = practiceAttempt?.songId ?? selectedPracticeSongId ?? 'arirang';
  const instrument = practiceAttempt?.instrument ?? selectedInstrument ?? 'gayageum';
  const score = scorePracticeAttempt(practiceAttempt);

  return {
    songId,
    instrument,
    accuracyScore: score.accuracyScore,
    timingScore: score.timingScore,
    timingTrendLabel: score.timingTrendLabel,
    resultKind: score.resultKind,
  };
}

export function buildPracticeResultFeedback(
  evaluation: Pick<
    PracticeResultEvaluation,
    'accuracyScore' | 'timingScore' | 'timingTrendLabel' | 'resultKind'
  >,
): PracticeResultFeedback {
  if (evaluation.resultKind === 'localTemplate') {
    return {
      title: LOCAL_TEMPLATE_FEEDBACK,
      description: '일부 구간은 조금 빠르게 들어갔지만 전체적인 선율 진행은 잘 유지했어요.',
      fullText: LOCAL_TEMPLATE_FEEDBACK,
    };
  }

  if (evaluation.accuracyScore >= 90) {
    const description = `${evaluation.timingTrendLabel}로 안정적인 연습 결과입니다.`;

    return {
      title: '정확한 흐름이에요.',
      description,
      fullText: `정확한 흐름이에요. ${description}`,
    };
  }

  if (evaluation.timingScore < 70) {
    const description = `${evaluation.timingTrendLabel}입니다. 가이드 박을 듣고 한 박자씩 천천히 맞춰보세요.`;

    return {
      title: '박자를 조금 더 맞춰보세요.',
      description,
      fullText: `박자를 조금 더 맞춰보세요. ${description}`,
    };
  }

  const description = `${evaluation.timingTrendLabel}입니다. 놓친 입력을 줄이면 정확도가 더 올라갑니다.`;

  return {
    title: '다시 연습하면 좋아질 구간이 있어요.',
    description,
    fullText: `다시 연습하면 좋아질 구간이 있어요. ${description}`,
  };
}

function scorePracticeAttempt(attempt: PracticeResultAttemptInput | undefined): {
  accuracyScore: number;
  timingScore: number;
  timingTrendLabel: string;
  resultKind: PracticeResultKind;
} {
  const inputEvents = attempt?.inputEvents ?? [];
  const timingErrorsMs = attempt?.timingErrorsMs ?? [];

  if (inputEvents.length === 0 && timingErrorsMs.length === 0) {
    return {
      accuracyScore: LOCAL_TEMPLATE_ACCURACY_SCORE,
      timingScore: LOCAL_TEMPLATE_TIMING_SCORE,
      timingTrendLabel: '로컬 템플릿 피드백',
      resultKind: 'localTemplate',
    };
  }

  const coverageScore = scoreInputCoverage(inputEvents);
  const averageTimingErrorMs = averageAbsoluteTimingError(timingErrorsMs);
  const timingScore =
    averageTimingErrorMs === undefined
      ? 92
      : clampScore(100 - Math.round(averageTimingErrorMs * 0.8));
  const accuracyScore = clampScore(Math.round(coverageScore * 0.7 + timingScore * 0.3));

  return {
    accuracyScore,
    timingScore,
    timingTrendLabel:
      averageTimingErrorMs === undefined
        ? '타이밍 기록 없음'
        : `박자 오차 평균 ${averageTimingErrorMs}ms`,
    resultKind: 'attemptEvidence',
  };
}

function scoreInputCoverage(inputEvents: PerformanceEvent[]): number {
  return clampScore(Math.round((inputEvents.length / EXPECTED_GUIDE_INPUT_COUNT) * 100));
}

function averageAbsoluteTimingError(timingErrorsMs: number[]): number | undefined {
  const finiteErrors = timingErrorsMs.filter(Number.isFinite);

  if (finiteErrors.length === 0) {
    return undefined;
  }

  return Math.round(
    finiteErrors.reduce((sum, errorMs) => sum + Math.abs(errorMs), 0) / finiteErrors.length,
  );
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}
