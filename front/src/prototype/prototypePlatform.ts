export function shouldStartPrototypeNativeAudioCandidate(platformOS: string): boolean {
  return platformOS === 'ios' || platformOS === 'android';
}
