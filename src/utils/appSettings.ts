import type { AppSettings } from '../types';

export const DEFAULT_WINDOW_SETTINGS = {
  width: 1600,
  height: 900,
  minWidth: 800,
  minHeight: 600,
  maxWidth: undefined,
  maxHeight: undefined,
  resizable: true
} as const;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  minimizeToTray: true,
  usageAnalyticsEnabled: false,
  usageAnalyticsPrompted: false,
  window: {
    ...DEFAULT_WINDOW_SETTINGS
  },
  videoSource: {
    activeProfileId: 'jingxuan',
    autoSelectBestSource: true,
    resumePlayback: true,
    preferManualSource: true,
    qualityPriority: 'balanced',
    preferredLineName: 'auto'
  }
};

export function mergeAppSettings(savedSettings?: Partial<AppSettings> | null): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...(savedSettings ?? {}),
    window: {
      ...DEFAULT_WINDOW_SETTINGS,
      ...(savedSettings?.window ?? {})
    },
    videoSource: {
      ...DEFAULT_APP_SETTINGS.videoSource,
      ...(savedSettings?.videoSource ?? {})
    }
  };
}
