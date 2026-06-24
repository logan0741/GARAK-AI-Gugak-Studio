import { GarakScreenFlowApp } from '../src/product/GarakScreenFlowApp';
import {
  PRODUCT_SAMPLE_FALLBACK_INSTRUMENTS,
  PRODUCT_SAMPLE_MANIFESTS,
} from '../src/product/productSampleReadinessConfig';

export default function Index() {
  return (
    <GarakScreenFlowApp
      sampleManifests={PRODUCT_SAMPLE_MANIFESTS}
      sampleFallbackInstruments={PRODUCT_SAMPLE_FALLBACK_INSTRUMENTS}
    />
  );
}
