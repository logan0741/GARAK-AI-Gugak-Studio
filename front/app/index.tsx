import { useFonts } from 'expo-font';

import { GarakScreenFlowApp } from '../src/product/GarakScreenFlowApp';
import {
  PRODUCT_SAMPLE_FALLBACK_INSTRUMENTS,
  PRODUCT_SAMPLE_MANIFESTS,
} from '../src/product/productSampleReadinessConfig';
import { applyGarakTextDefaults, GARAK_FONT_ASSETS } from '../src/product/garakTypography';

applyGarakTextDefaults();

export default function Index() {
  const [fontsLoaded] = useFonts(GARAK_FONT_ASSETS);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GarakScreenFlowApp
      sampleManifests={PRODUCT_SAMPLE_MANIFESTS}
      sampleFallbackInstruments={PRODUCT_SAMPLE_FALLBACK_INSTRUMENTS}
    />
  );
}
