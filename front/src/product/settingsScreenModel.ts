import { GARAK_BRAND } from './productFixtures';
import type { GarakProductAction, GarakProductState } from './garakProductState';

export type SettingsStatusRow = {
  label: string;
  value: string;
};

export type SettingsViewModel = {
  rows: SettingsStatusRow[];
  actions: {
    changeLanguage: GarakProductAction;
    manageLibrary: GarakProductAction;
    loginAndLoadMySongs: GarakProductAction;
  };
};

export function getSettingsViewModel(state: GarakProductState): SettingsViewModel {
  const shareableCount = state.library.exportedAudios.length + state.library.practiceResults.length;
  const localLibrarySummary = `작업 ${state.library.works.length}개 · 내보낸 음원/결과 ${shareableCount}개`;
  const syncPrefix = state.account.status === 'guest' ? '로컬 저장' : '계정 동기화';

  return {
    rows: [
      { label: '현재 상태', value: state.account.status === 'guest' ? '게스트' : '로그인' },
      { label: '로컬 보관함 저장 상태', value: localLibrarySummary },
      { label: '동기화 상태', value: `${syncPrefix} · ${localLibrarySummary}` },
      { label: '언어', value: languageLabel(state.language) },
      { label: '앱 정보', value: `${GARAK_BRAND.serviceName} · ${GARAK_BRAND.subtitle}` },
    ],
    actions: {
      changeLanguage: { type: 'navigate', target: 'S02' },
      manageLibrary: { type: 'navigate', target: 'S18' },
      loginAndLoadMySongs: { type: 'loginAndLoadMySongs' },
    },
  };
}

function languageLabel(language: GarakProductState['language']): string {
  return language === 'ko' ? '한국어' : 'English';
}
