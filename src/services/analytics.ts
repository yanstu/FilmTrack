import { getVersion } from '@tauri-apps/api/app';
import { fetch } from '@tauri-apps/plugin-http';

import type { AppSettings } from '../types';

const UMAMI_ENDPOINT = 'https://umami.yanstu.cn/api/send';
const UMAMI_WEBSITE_ID = 'f713eebd-ebab-43cf-b916-dc557d1ced73';
const UMAMI_HOST = 'filmtrack.desktop';
const UMAMI_URL = 'app://filmtrack';
const SESSION_CACHE_KEY = '__filmtrack_analytics_session__';

interface UmamiPayload {
  type: 'event';
  payload: {
    hostname: string;
    language: string;
    referrer: string;
    screen: string;
    title: string;
    url: string;
    website: string;
    id: string;
    name?: string;
    data?: Record<string, string>;
  };
}

function getScreenSize(): string {
  if (typeof window === 'undefined') {
    return '0x0';
  }

  return `${window.screen.width}x${window.screen.height}`;
}

function getLanguage(): string {
  if (typeof navigator === 'undefined') {
    return 'zh-CN';
  }

  return navigator.language || 'zh-CN';
}

function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') {
    return 'desktop-session';
  }

  const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const sessionId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  sessionStorage.setItem(SESSION_CACHE_KEY, sessionId);
  return sessionId;
}

async function buildEventData(): Promise<Record<string, string>> {
  const appVersion = await getVersion().catch(() => 'unknown');
  const navigatorWithPlatform = typeof navigator === 'undefined'
    ? null
    : navigator as Navigator & {
        userAgentData?: {
          platform?: string;
        };
      };

  return {
    appVersion,
    platform: navigatorWithPlatform?.userAgentData?.platform || navigatorWithPlatform?.platform || 'unknown',
    runtime: 'tauri'
  };
}

async function sendUmamiPayload(payload: UmamiPayload, appVersion: string): Promise<void> {
  const response = await fetch(UMAMI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': `FilmTrack/${appVersion} (Tauri Desktop)`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`统计上报失败: ${response.status}`);
  }
}

export async function trackAppLaunch(settings: AppSettings): Promise<void> {
  if (!settings.usageAnalyticsEnabled) {
    return;
  }

  const data = await buildEventData();
  const appVersion = data.appVersion || 'unknown';
  const sessionId = getSessionId();

  const pageviewPayload: UmamiPayload = {
    type: 'event',
    payload: {
      website: UMAMI_WEBSITE_ID,
      hostname: UMAMI_HOST,
      url: '/',
      title: 'FilmTrack Desktop',
      id: sessionId,
      referrer: '',
      language: getLanguage(),
      screen: getScreenSize()
    }
  };

  const appLaunchPayload: UmamiPayload = {
    type: 'event',
    payload: {
      website: UMAMI_WEBSITE_ID,
      hostname: UMAMI_HOST,
      url: UMAMI_URL,
      title: 'FilmTrack Desktop',
      id: sessionId,
      name: 'app_launch',
      referrer: '',
      language: getLanguage(),
      screen: getScreenSize(),
      data
    }
  };

  await sendUmamiPayload(pageviewPayload, appVersion);
  await sendUmamiPayload(appLaunchPayload, appVersion);
}
