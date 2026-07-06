import type { PerformanceEvent } from '../domain/performanceEvent';
import type { InstrumentId } from '../studio/studioTypes';
import type { GarakProductServices } from './garakProductServices';
import type { GarakProductAction } from './garakProductState';

export async function playLivePerformanceEventsWithFailureDispatch({
  services,
  instrument,
  events,
  dispatch,
}: {
  services: GarakProductServices;
  instrument: InstrumentId;
  events: PerformanceEvent[];
  dispatch: (action: GarakProductAction) => void;
}): Promise<void> {
  try {
    const result = await services.audio.playPerformanceEvents({
      instrument,
      events,
    });

    if (result.status !== 'ok') {
      dispatch({
        type: 'failLivePerformanceEventPlayback',
        instrument,
        message:
          result.status === 'error'
            ? result.message
            : 'Live performance audio service is unavailable.',
      });
      return;
    }

    dispatch({
      type: 'completeLivePerformanceEventPlayback',
      instrument,
      eventCount: result.value.handledEvents,
    });
  } catch (error) {
    dispatch({
      type: 'failLivePerformanceEventPlayback',
      instrument,
      message: error instanceof Error ? error.message : 'Live performance audio failed.',
    });
  }
}
