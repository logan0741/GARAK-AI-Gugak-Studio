import { useFonts } from 'expo-font';

import { GarakAuthEntryApp } from '../src/product/GarakAuthEntryApp';
import { applyGarakTextDefaults, GARAK_FONT_ASSETS } from '../src/product/garakTypography';

applyGarakTextDefaults();

export default function Index() {
  const [fontsLoaded] = useFonts(GARAK_FONT_ASSETS);

  if (!fontsLoaded) {
    return null;
  }

  return <GarakAuthEntryApp />;
}
