import { expect, test } from 'vitest';

import { createInitialGarakProductState } from '../garakProductState';
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

test('keeps S01 as the Figma hero entry without mode-selection copy', () => {
  const model = getHomeScreenViewModel(createInitialGarakProductState());

  expect('modeOptions' in model).toBe(false);
  expect('selectedModeTitle' in model).toBe(false);
  expect('selectedModeDescription' in model).toBe(false);
});
