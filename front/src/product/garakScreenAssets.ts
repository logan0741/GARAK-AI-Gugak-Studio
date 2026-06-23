export const GARAK_SCREEN_ASSETS = {
  brand: {
    // Replace this PNG fallback with the provided GARAK SVG once the asset is in the repo.
    wordmark: require('../../assets/product/brand-wordmark-garak.png'),
  },
  shell: {
    homeEntryButton: require('../../assets/product/home-entry-globe-button.png'),
    profileAvatar: require('../../assets/product/profile-avatar.png'),
  },
  home: {
    playHero: require('../../assets/product/home-play-hero.png'),
  },
  creation: {
    jangguInstrumentPanel: require('../../assets/product/creation-instrument-janggu-panel.png'),
  },
  library: {
    playlistPanel: require('../../assets/product/library-playlist-panel.png'),
  },
  share: {
    myGarakPlayer: require('../../assets/product/share-my-garak-player.png'),
    recentPlaybackStrip: require('../../assets/product/share-recent-playback-strip.png'),
    recommendationHero: require('../../assets/product/share-recommendation-hero.png'),
  },
} as const;
