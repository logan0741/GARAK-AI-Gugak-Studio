import { mergeAccountLibraryPreview } from '../studio/studioLibrary';
import type { Work } from '../studio/studioTypes';
import type { GarakProductAction, GarakProductState } from './garakProductState';

const ACCOUNT_LIBRARY_WORKS: Work[] = [];

export type LoginSyncViewModel = {
  statusLabel: string;
  localSummary: string;
  accountSummary: string;
  conflictLabel: string;
  syncPreviewLabel: string;
  emptyAccountMessage?: string;
  actions: {
    login: GarakProductAction;
    sync: GarakProductAction;
    importSelected: GarakProductAction;
    skip: GarakProductAction;
  };
};

export function getLoginSyncViewModel(state: GarakProductState): LoginSyncViewModel {
  const preview = mergeAccountLibraryPreview({
    localWorks: state.library.works,
    accountWorks: ACCOUNT_LIBRARY_WORKS,
  });
  const shareableCount = state.library.exportedAudios.length + state.library.practiceResults.length;

  return {
    statusLabel:
      state.account.status === 'guest'
        ? '로그인 전 · 로컬 보관함 유지'
        : '로그인됨 · 계정 동기화 준비',
    localSummary: `로컬 작업 ${state.library.works.length}개 · 내보낸 음원/결과 ${shareableCount}개`,
    accountSummary: `계정 보관함 ${ACCOUNT_LIBRARY_WORKS.length}개`,
    conflictLabel: `충돌 항목 ${preview.conflictWorkIds.length}개`,
    syncPreviewLabel: `동기화 후 ${preview.mergedWorkCount}개 작업 · ${
      preview.localPreserved ? '로컬 항목 보존' : '로컬 항목 확인 필요'
    }`,
    emptyAccountMessage:
      ACCOUNT_LIBRARY_WORKS.length === 0 ? '계정에 저장된 곡이 없어요.' : undefined,
    actions: {
      login: { type: 'completeLoginSync' },
      sync: { type: 'completeLoginSync' },
      importSelected: { type: 'completeLoginSync' },
      skip: { type: 'navigate', target: 'S22' },
    },
  };
}
