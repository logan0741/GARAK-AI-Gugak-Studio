import type { GarakProductAction, GarakProductState } from './garakProductState';
import {
  KOGL_TYPE_1_LICENSE_URL,
  NGC_MONOTONE_SOURCE_URL,
} from './livePerformanceBundledSamples';
import { GARAK_BRAND } from './productFixtures';

export type SettingsStatusRow = {
  label: string;
  value: string;
};

export type SettingsAudioSourceNotice = {
  title: string;
  body: string;
  sourceUrl: string;
  licenseUrl: string;
};

export type SettingsViewModel = {
  rows: SettingsStatusRow[];
  audioSourceNotice: SettingsAudioSourceNotice;
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
      {
        label: isEn ? 'Audio Sources' : '오디오 출처',
        value: isEn
          ? 'National Gugak Center · KOGL Type 1 · Janggu/Daegeum'
          : '국립국악원 · 공공누리 제1유형 · 장구/대금',
      },
      { label: isEn ? 'App Info' : '앱 정보', value: `${GARAK_BRAND.serviceName} · ${GARAK_BRAND.subtitle}` },
    ],
    audioSourceNotice: {
      title: isEn ? 'Audio Source Attribution' : '오디오 출처 표기',
      body: isEn
        ? 'Janggu and daegeum performance samples use National Gugak Center monotone assets under KOGL Type 1 attribution terms.'
        : '장구와 대금 연주 샘플은 국립국악원 국악기 디지털 음원 단음 자료를 공공누리 제1유형 출처표시 조건에 따라 사용합니다.',
      sourceUrl: NGC_MONOTONE_SOURCE_URL,
      licenseUrl: KOGL_TYPE_1_LICENSE_URL,
    },
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
