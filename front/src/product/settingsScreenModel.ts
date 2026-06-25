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
  const isEn = state.language === 'en';
  const localLibrarySummary = isEn
    ? `Works: ${state.library.works.length} · Exported audio/results: ${shareableCount}`
    : `작업 ${state.library.works.length}개 · 내보낸 음원/결과 ${shareableCount}개`;
  const syncPrefix =
    state.account.status === 'guest'
      ? (isEn ? 'Local storage' : '로컬 저장')
      : (isEn ? 'Account sync' : '계정 동기화');
  const accountStatusLabel =
    state.account.status === 'guest'
      ? (isEn ? 'Guest' : '게스트')
      : (isEn ? 'Logged In' : '로그인');

  return {
    rows: [
      {
        label: isEn ? 'Current Status' : '현재 상태',
        value: accountStatusLabel,
      },
      { label: isEn ? 'Local Library Storage' : '로컬 보관함 저장 상태', value: localLibrarySummary },
      { label: isEn ? 'Sync Status' : '동기화 상태', value: `${syncPrefix} · ${localLibrarySummary}` },
      { label: isEn ? 'Language' : '언어', value: languageLabel(state.language) },
      { label: isEn ? 'App Info' : '앱 정보', value: `${GARAK_BRAND.serviceName} · ${GARAK_BRAND.subtitle}` },
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
