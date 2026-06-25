import { useFonts } from 'expo-font';

import { GarakAuthEntryApp } from '../src/product/GarakAuthEntryApp';
import { GARAK_FONT_ASSETS } from '../src/product/garakTypography';

export default function Index() {
  const [fontsLoaded] = useFonts(GARAK_FONT_ASSETS);

  if (!fontsLoaded) {
    return null;
  }

  return <GarakAuthEntryApp />;
}
