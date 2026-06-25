import { expect, test } from 'vitest';

import { applyProductAction, createInitialGarakProductState } from '../garakProductState';
import { getHomeScreenViewModel } from '../homeScreenModel';

test('uses the selected language for the S01 home labels', () => {
  expect(getHomeScreenViewModel(createInitialGarakProductState())).toMatchObject({
    title: 'GARAK과 함께 국악 연주하기',
    description: '전통 악기를 연주하고, AI와 함께 자신만의 가락을 완성할 수 있습니다.',
    ctaLabel: 'PLAY',
    quickAccessLabels: {
      library: '마이',
      home: '홈',
      share: '쉐어',
    },
  });

  expect(
    getHomeScreenViewModel({
      ...createInitialGarakProductState(),
      language: 'en',
    }),
  ).toMatchObject({
    title: 'Play gugak with GARAK',
    description: 'Play traditional instruments and complete your own garak with AI.',
    ctaLabel: 'PLAY',
    quickAccessLabels: {
      library: 'My',
      home: 'Home',
      share: 'Share',
    },
  });
});

test('models the S01 free-creation and practice mode choices', () => {
  const freeCreationModel = getHomeScreenViewModel(createInitialGarakProductState());

  expect(freeCreationModel.modeOptions).toEqual([
    {
      id: 'freeCreation',
      label: '자유창작 모드',
      isSelected: true,
      selectAction: { type: 'selectMode', mode: 'freeCreation' },
    },
    {
      id: 'practice',
      label: '따라하기 모드',
      isSelected: false,
      selectAction: { type: 'selectMode', mode: 'practice' },
    },
  ]);
  expect(freeCreationModel.selectedModeTitle).toBe('자유창작 모드');
  expect(freeCreationModel.selectedModeDescription).toContain('나만의 가락');

  const practiceModel = getHomeScreenViewModel(
    applyProductAction(createInitialGarakProductState(), { type: 'selectMode', mode: 'practice' }),
  );

  expect(practiceModel.modeOptions).toMatchObject([
    { id: 'freeCreation', isSelected: false },
    { id: 'practice', isSelected: true },
  ]);
  expect(practiceModel.selectedModeTitle).toBe('따라하기 모드');
  expect(practiceModel.selectedModeDescription).toContain('민요');
});
