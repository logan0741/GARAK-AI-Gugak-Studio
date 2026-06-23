import { JangdanRecommendation, recommendJangdan } from '../domain/jangdan';
import { PerformanceEvent } from '../domain/performanceEvent';

const MINIMUM_JANGDAN_PREVIEW_EVENTS = 4;

export type PrototypeJangdanPreview =
  | {
      minimumEvents: number;
      observedEvents: number;
      status: 'insufficient_events';
    }
  | {
      observedEvents: number;
      recommendation: JangdanRecommendation;
      status: 'ready';
    };

export function createPrototypeJangdanPreview(
  events: PerformanceEvent[],
): PrototypeJangdanPreview {
  const pluckLikeEventCount = countPluckLikeEvents(events);

  if (pluckLikeEventCount < MINIMUM_JANGDAN_PREVIEW_EVENTS) {
    return {
      minimumEvents: MINIMUM_JANGDAN_PREVIEW_EVENTS,
      observedEvents: pluckLikeEventCount,
      status: 'insufficient_events',
    };
  }

  return {
    observedEvents: pluckLikeEventCount,
    recommendation: recommendJangdan(events),
    status: 'ready',
  };
}

export function formatPrototypeJangdanPreview(preview: PrototypeJangdanPreview): string {
  if (preview.status === 'insufficient_events') {
    return 'waiting for event context';
  }

  const { recommendation } = preview;
  return [
    recommendation.jangdan,
    `score ${recommendation.score}`,
    `${recommendation.bpmEstimate} BPM`,
    recommendation.density,
    recommendation.reason,
  ].join(' | ');
}

function countPluckLikeEvents(events: PerformanceEvent[]): number {
  return events.filter(
    (event) => event.type === 'string_pluck' || event.type === 'glissando_step',
  ).length;
}
