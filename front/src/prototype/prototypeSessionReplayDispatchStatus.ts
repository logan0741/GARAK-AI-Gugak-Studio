import {
  formatEngineDispatchFailure,
  SessionReplayDispatchResult,
} from './gayageumPrototypeController';

export type PrototypeSessionReplayDispatchStatus =
  | {
      status: 'none';
      text: string;
    }
  | {
      eventCount: number;
      status: 'dispatched';
      text: string;
    }
  | {
      errorMessage: string;
      status: 'failed';
      text: string;
    };

export function createInitialPrototypeSessionReplayDispatchStatus(): PrototypeSessionReplayDispatchStatus {
  return {
    status: 'none',
    text: 'none',
  };
}

export function createPrototypeSessionReplayDispatchStatus(
  result: SessionReplayDispatchResult,
): PrototypeSessionReplayDispatchStatus {
  if (result.ok) {
    return {
      eventCount: result.events.length,
      status: 'dispatched',
      text: `Replay dispatched: ${result.events.length} events`,
    };
  }

  const errorMessage =
    result.status === 'dispatch_failed'
      ? formatEngineDispatchFailure(result.dispatch)
      : result.errorMessage;

  return {
    errorMessage,
    status: 'failed',
    text: `Replay failed: ${errorMessage}`,
  };
}

export function clearPrototypeSessionReplayDispatchStatus(): PrototypeSessionReplayDispatchStatus {
  return createInitialPrototypeSessionReplayDispatchStatus();
}

export function formatPrototypeSessionReplayDispatchStatus(
  status: PrototypeSessionReplayDispatchStatus,
): string {
  return status.text;
}
