import type { ExportedAudio, PracticeResult, Work } from '../studio/studioTypes';
import type { GarakProductAction, GarakProductState, ProductLibraryTab } from './garakProductState';
import { getInstrumentName, getPracticeSongTitle } from './productFixtures';

export type MyLibraryHeroCard = {
  id: string;
  title: string;
  tone: 'red' | 'light' | 'navy';
  date?: string;
  playable: boolean;
  workId?: string;
  exportedAudioId?: string;
  practiceResultId?: string;
};

export type MyLibraryPlaylistRow = {
  id: string;
  title: string;
  date: string;
  kind: 'work' | 'exportedAudio' | 'practiceResult' | 'demo';
  playable: boolean;
  active: boolean;
  subtitle?: string;
  workId?: string;
  exportedAudioId?: string;
  practiceResultId?: string;
};

export type MyLibraryTab = {
  id: ProductLibraryTab;
  label: string;
  active: boolean;
  count: number;
};

export type MyLibraryEmptyState = {
  title: string;
  description: string;
  ctaLabel: string;
  action: GarakProductAction;
};

export type MyLibraryViewModel = {
  heroCards: MyLibraryHeroCard[];
  playlistRows: MyLibraryPlaylistRow[];
  tabs: MyLibraryTab[];
  searchQuery: string;
  syncLabel: string;
  emptyState?: MyLibraryEmptyState;
};

export type MyLibraryPlayerViewModel = {
  title: string;
  meta: string;
  sourceKind: MyLibraryPlaylistRow['kind'];
  elapsedLabel: string;
  remainingLabel: string;
  showsAirPlay: boolean;
  editWorkId?: string;
};

export type MyLibraryPlayerActions = {
  editAction?: GarakProductAction;
  shareAction?: GarakProductAction;
  deleteAction?: GarakProductAction;
  backAction: GarakProductAction;
};

type ActualLibraryRow = MyLibraryPlaylistRow & {
  sortKey: number;
  order: number;
};

const MAX_VISIBLE_PLAYLIST_ROWS = 5;

const FIGMA_DEMO_PLAYLIST_ROWS: MyLibraryPlaylistRow[] = [
  {
    id: 'demo-my-arirang',
    title: 'My Arirang',
    date: '2026.06.01',
    kind: 'demo',
    playable: true,
    active: false,
  },
  {
    id: 'demo-falling-water',
    title: 'Falling water in a valley',
    date: '2026.05.05',
    kind: 'demo',
    playable: true,
    active: false,
  },
  {
    id: 'demo-forest-birds',
    title: 'Forest Birds singing',
    date: '2026.04.20',
    kind: 'demo',
    playable: true,
    active: false,
  },
  {
    id: 'demo-sea-waves-march',
    title: 'sea waves',
    date: '2026.03.19',
    kind: 'demo',
    playable: true,
    active: false,
  },
  {
    id: 'demo-sea-waves-february',
    title: 'sea waves',
    date: '2026.02.03',
    kind: 'demo',
    playable: true,
    active: false,
  },
];

export function getMyLibraryViewModel(state: GarakProductState): MyLibraryViewModel {
  const actualRows = getActualLibraryRows(state);
  const activeTab = state.libraryTab;
  const searchQuery = state.librarySearchQuery.trim();
  const tabRows = actualRows.filter((row) => rowMatchesLibraryTab(row, activeTab));
  const filteredRows = filterLibraryRows(tabRows, searchQuery);
  const shouldFillWithDemoRows = activeTab === 'works' && searchQuery.length === 0;
  const playlistRows = markFirstRowActive(
    shouldFillWithDemoRows ? fillWithDemoRows(filteredRows) : filteredRows,
  );
  const primaryHero = createPrimaryHeroCard(playlistRows[0]);

  return {
    heroCards: [
      {
        id: 'hero-kdrama-ost',
        title: 'K-Drama OST',
        tone: 'red',
        playable: false,
      },
      {
        id: 'hero-kpop-demon-hunters',
        title: 'K-pop Demon Hunters',
        tone: 'light',
        playable: false,
      },
      primaryHero,
    ],
    playlistRows,
    tabs: createLibraryTabs(state, actualRows),
    searchQuery: state.librarySearchQuery,
    syncLabel: createLibrarySyncLabel(state),
    emptyState: createLibraryEmptyState(state, filteredRows),
  };
}

export function getMyLibraryPlayerViewModel(state: GarakProductState): MyLibraryPlayerViewModel {
  const selection = state.selectedPlayerItem;

  if (selection?.kind === 'work') {
    const work = state.library.works.find((item) => item.id === selection.workId);

    if (work !== undefined) {
      return createWorkPlayerViewModel(work);
    }
  }

  if (selection?.kind === 'exportedAudio') {
    const audio = state.library.exportedAudios.find((item) => item.id === selection.exportedAudioId);

    if (audio !== undefined) {
      return createExportedAudioPlayerViewModel(audio);
    }
  }

  if (selection?.kind === 'practiceResult') {
    const result = state.library.practiceResults.find((item) => item.id === selection.practiceResultId);

    if (result !== undefined) {
      return createPracticeResultPlayerViewModel(result);
    }
  }

  if (selection?.kind === 'demo') {
    return createDemoPlayerViewModel(selection.title);
  }

  const exportedAudio = state.library.exportedAudios[0];

  if (exportedAudio !== undefined) {
    return createExportedAudioPlayerViewModel(exportedAudio);
  }

  const work = state.library.works[0];

  if (work !== undefined) {
    return createWorkPlayerViewModel(work);
  }

  return createDemoPlayerViewModel('My Arirang');
}

export function getMyLibraryPlayerActions(state: GarakProductState): MyLibraryPlayerActions {
  const player = getMyLibraryPlayerViewModel(state);
  const selection = state.selectedPlayerItem;
  const canShare =
    selection?.kind === 'exportedAudio'
      ? state.library.exportedAudios.some((audio) => audio.id === selection.exportedAudioId)
      : selection?.kind === 'practiceResult'
        ? state.library.practiceResults.some((result) => result.id === selection.practiceResultId)
        : false;

  return {
    editAction: player.editWorkId !== undefined ? { type: 'openSelectedPlayerEditor' } : undefined,
    shareAction: canShare ? { type: 'shareSelectedPlayerItem' } : undefined,
    deleteAction: canShare ? { type: 'deleteSelectedPlayerItem' } : undefined,
    backAction: { type: 'navigate', target: 'S18' },
  };
}

export function getMyLibraryItemAction(
  item: MyLibraryHeroCard | MyLibraryPlaylistRow,
): GarakProductAction | undefined {
  if (!item.playable) {
    return undefined;
  }

  if (item.workId !== undefined) {
    return { type: 'openWork', workId: item.workId };
  }

  if (item.exportedAudioId !== undefined) {
    return {
      type: 'playLibraryItem',
      item: { kind: 'exportedAudio', exportedAudioId: item.exportedAudioId },
    };
  }

  if (item.practiceResultId !== undefined) {
    return {
      type: 'playLibraryItem',
      item: { kind: 'practiceResult', practiceResultId: item.practiceResultId },
    };
  }

  return {
    type: 'playLibraryItem',
    item: { kind: 'demo', title: item.title, date: item.date },
  };
}

function getActualLibraryRows(state: GarakProductState): ActualLibraryRow[] {
  let order = 0;

  const workRows: ActualLibraryRow[] = state.library.works.map((work) => ({
    id: `work-${work.id}`,
    title: work.title,
    date: formatLibraryDate(work.updatedAt || work.createdAt),
    kind: 'work',
    playable: true,
    active: false,
    subtitle: `${work.tracks.length} track${work.tracks.length === 1 ? '' : 's'}`,
    workId: work.id,
    sortKey: toSortKey(work.updatedAt || work.createdAt),
    order: order++,
  }));

  const exportRows: ActualLibraryRow[] = state.library.exportedAudios.map((audio) => ({
    id: `export-${audio.id}`,
    title: audio.title,
    date: formatLibraryDate(audio.createdAt),
    kind: 'exportedAudio',
    playable: true,
    active: false,
    subtitle: formatExportedAudioSubtitle(audio),
    exportedAudioId: audio.id,
    sortKey: toSortKey(audio.createdAt),
    order: order++,
  }));

  const practiceRows: ActualLibraryRow[] = state.library.practiceResults.map((result) => ({
    id: `practice-${result.id}`,
    title: `${formatPracticeSongTitle(result.songId)} 연습`,
    date: formatLibraryDate(result.createdAt),
    kind: 'practiceResult',
    playable: true,
    active: false,
    subtitle: `${getInstrumentName(result.instrument)} ${result.accuracyScore}점`,
    practiceResultId: result.id,
    sortKey: toSortKey(result.createdAt),
    order: order++,
  }));

  return [...workRows, ...exportRows, ...practiceRows].sort((left, right) => {
    if (right.sortKey !== left.sortKey) {
      return right.sortKey - left.sortKey;
    }

    return left.order - right.order;
  });
}

function rowMatchesLibraryTab(row: ActualLibraryRow, tab: ProductLibraryTab): boolean {
  return tab === 'works' ? row.kind === 'work' : row.kind === 'exportedAudio' || row.kind === 'practiceResult';
}

function filterLibraryRows(rows: ActualLibraryRow[], searchQuery: string): ActualLibraryRow[] {
  if (searchQuery.length === 0) {
    return rows;
  }

  const normalizedQuery = searchQuery.toLocaleLowerCase();

  return rows.filter((row) =>
    [row.title, row.subtitle, row.date, row.kind]
      .filter((value): value is string => value !== undefined)
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
  );
}

function createLibraryTabs(state: GarakProductState, rows: ActualLibraryRow[]): MyLibraryTab[] {
  const worksCount = rows.filter((row) => row.kind === 'work').length;
  const shareablesCount = rows.filter((row) => row.kind === 'exportedAudio' || row.kind === 'practiceResult').length;

  return [
    {
      id: 'works',
      label: '작업',
      active: state.libraryTab === 'works',
      count: worksCount,
    },
    {
      id: 'shareables',
      label: '내보낸 음원/결과',
      active: state.libraryTab === 'shareables',
      count: shareablesCount,
    },
  ];
}

function createLibrarySyncLabel(state: GarakProductState): string {
  const syncPrefix = state.account.status === 'guest' ? '로컬 저장' : '계정 동기화';
  const shareableCount = state.library.exportedAudios.length + state.library.practiceResults.length;

  return `${syncPrefix} · 작업 ${state.library.works.length}개 · 내보낸 음원/결과 ${shareableCount}개`;
}

function createLibraryEmptyState(
  state: GarakProductState,
  filteredRows: ActualLibraryRow[],
): MyLibraryEmptyState | undefined {
  if (filteredRows.length > 0) {
    return undefined;
  }

  if (state.librarySearchQuery.trim().length > 0) {
    return {
      title: '검색 결과가 없어요.',
      description: '다른 곡명, 악기, 날짜로 다시 검색해 보세요.',
      ctaLabel: '검색 지우기',
      action: { type: 'updateLibrarySearchQuery', query: '' },
    };
  }

  if (state.libraryTab === 'works') {
    return {
      title: '아직 만든 작업이 없어요.',
      description: '첫 연주를 시작하면 자동 저장된 작업이 여기에 표시됩니다.',
      ctaLabel: '첫 연주 시작하기',
      action: { type: 'navigate', target: 'S01' },
    };
  }

  return {
    title: '아직 내보낸 음원이 없어요.',
    description: '최근 작업을 열어 내보내면 공유 가능한 결과가 여기에 표시됩니다.',
    ctaLabel: state.library.works.length > 0 ? '최근 작업 열기' : '첫 연주 시작하기',
    action:
      state.library.works[0] !== undefined
        ? { type: 'openWork', workId: state.library.works[0].id }
        : { type: 'navigate', target: 'S01' },
  };
}

function fillWithDemoRows(rows: MyLibraryPlaylistRow[]): MyLibraryPlaylistRow[] {
  const visibleRows = rows.slice(0, MAX_VISIBLE_PLAYLIST_ROWS);

  if (visibleRows.length >= MAX_VISIBLE_PLAYLIST_ROWS) {
    return visibleRows;
  }

  return [
    ...visibleRows,
    ...FIGMA_DEMO_PLAYLIST_ROWS.slice(0, MAX_VISIBLE_PLAYLIST_ROWS - visibleRows.length),
  ];
}

function markFirstRowActive(rows: MyLibraryPlaylistRow[]): MyLibraryPlaylistRow[] {
  return rows.map((row, index) => ({
    ...row,
    active: index === 0,
  }));
}

function createPrimaryHeroCard(row: MyLibraryPlaylistRow | undefined): MyLibraryHeroCard {
  if (row === undefined || row.kind === 'demo') {
    return {
      id: 'hero-korea-minyo',
      title: 'Korea Minyo',
      date: '2026.02.01',
      tone: 'navy',
      playable: true,
    };
  }

  return {
    id: `hero-${row.id}`,
    title: row.title,
    date: row.date,
    tone: 'navy',
    playable: row.playable,
    workId: row.workId,
    exportedAudioId: row.exportedAudioId,
    practiceResultId: row.practiceResultId,
  };
}

function createWorkPlayerViewModel(work: Work): MyLibraryPlayerViewModel {
  return {
    title: work.title,
    meta: `사용 악기 ${formatWorkInstrumentNames(work)} · ${formatLibraryDate(work.updatedAt || work.createdAt)}`,
    sourceKind: 'work',
    ...FIGMA_PLAYING_PLAYER_STATE,
    editWorkId: work.id,
  };
}

function createExportedAudioPlayerViewModel(audio: ExportedAudio): MyLibraryPlayerViewModel {
  return {
    title: audio.title,
    meta: formatExportedAudioPlayerMeta(audio),
    sourceKind: 'exportedAudio',
    ...FIGMA_PLAYING_PLAYER_STATE,
    editWorkId: audio.workId,
  };
}

function createPracticeResultPlayerViewModel(result: PracticeResult): MyLibraryPlayerViewModel {
  return {
    title: `${formatPracticeSongTitle(result.songId)} 연습`,
    meta: `사용 악기 ${getInstrumentName(result.instrument)} · 정확도 ${result.accuracyScore}점`,
    sourceKind: 'practiceResult',
    ...FIGMA_PLAYING_PLAYER_STATE,
  };
}

function createDemoPlayerViewModel(title: string): MyLibraryPlayerViewModel {
  return {
    title,
    meta: '사용 악기 가야금',
    sourceKind: 'demo',
    ...FIGMA_PLAYING_PLAYER_STATE,
  };
}

const FIGMA_PLAYING_PLAYER_STATE = {
  elapsedLabel: '0:13',
  remainingLabel: '-3:01',
  showsAirPlay: true,
} as const;

function formatWorkInstrumentNames(work: Work): string {
  const names = work.tracks
    .filter((track) => track.kind === 'instrument')
    .map((track) => (track.kind === 'instrument' ? getInstrumentName(track.instrument) : ''))
    .filter((name) => name.length > 0);
  const uniqueNames = [...new Set(names)];

  return uniqueNames.length > 0 ? uniqueNames.join(', ') : '작업 트랙';
}

function formatLibraryDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match === null) {
    return value;
  }

  return `${match[1]}.${match[2]}.${match[3]}`;
}

function toSortKey(value: string): number {
  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDuration(durationSeconds: number): string {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.round(durationSeconds % 60);

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatExportedAudioSubtitle(audio: ExportedAudio): string {
  return joinMetadata([
    formatSharedSource(audio),
    `${audio.instrumentNames.join(', ')} · ${formatDuration(audio.durationSeconds)}`,
  ]);
}

function formatExportedAudioPlayerMeta(audio: ExportedAudio): string {
  return joinMetadata([
    formatSharedSource(audio),
    `사용 악기 ${audio.instrumentNames.join(', ') || '가야금'} · ${formatDuration(audio.durationSeconds)}`,
  ]);
}

function formatSharedSource(audio: ExportedAudio): string | undefined {
  if (audio.authorDisplayName === undefined || audio.sourceLabel === undefined) {
    return undefined;
  }

  return `${audio.authorDisplayName} · ${audio.sourceLabel}`;
}

function joinMetadata(parts: Array<string | undefined>): string {
  return parts.filter((part): part is string => part !== undefined && part.length > 0).join(' · ');
}

function formatPracticeSongTitle(songId: string): string {
  if (songId === 'arirang' || songId === 'doraji' || songId === 'boatSong') {
    return getPracticeSongTitle(songId);
  }

  return songId;
}
