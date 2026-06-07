import { PerformanceEvent } from './performanceEvent';

export type JangdanName = 'jungmori' | 'gutgeori' | 'jajinmori';

export type JangdanRecommendation = {
  jangdan: JangdanName;
  score: number;
  bpmEstimate: number;
  density: 'low' | 'medium' | 'high';
  reason: string;
};

function pluckLikeEvents(events: PerformanceEvent[]): PerformanceEvent[] {
  return events.filter((event) => event.type === 'string_pluck' || event.type === 'glissando_step');
}

export function estimateBpm(events: PerformanceEvent[]): number {
  const pluckTimes = pluckLikeEvents(events)
    .map((event) => event.tsMs)
    .sort((a, b) => a - b);

  if (pluckTimes.length < 2) {
    return 80;
  }

  const intervals = pluckTimes.slice(1).map((time, index) => time - pluckTimes[index]);
  const averageIntervalMs = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  return Math.round(60000 / averageIntervalMs);
}

export function estimateDensity(events: PerformanceEvent[]): 'low' | 'medium' | 'high' {
  const count = pluckLikeEvents(events).length;
  if (count <= 4) return 'low';
  if (count <= 6) return 'medium';
  return 'high';
}

export function recommendJangdan(events: PerformanceEvent[]): JangdanRecommendation {
  const bpmEstimate = estimateBpm(events);
  const density = estimateDensity(events);

  if (bpmEstimate <= 75 && density === 'low') {
    return {
      jangdan: 'jungmori',
      score: 0.8,
      bpmEstimate,
      density,
      reason: 'slow tempo and low density suggest jungmori',
    };
  }

  if (bpmEstimate >= 160 || density === 'high') {
    return {
      jangdan: 'jajinmori',
      score: 0.75,
      bpmEstimate,
      density,
      reason: 'fast tempo or high density suggest jajinmori',
    };
  }

  return {
    jangdan: 'gutgeori',
    score: 0.7,
    bpmEstimate,
    density,
    reason: 'medium tempo and density suggest gutgeori',
  };
}
