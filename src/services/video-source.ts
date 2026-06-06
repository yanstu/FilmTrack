import JSON5 from 'json5';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { invoke } from '@tauri-apps/api/core';
import type {
  MatchContext,
  MatchResponsePayload,
  Movie,
  PlaybackProgressPayload,
  ResolvedVideoStream,
  SearchHit,
  SourceProfileSettings,
  SourceProfileSummary,
  VideoDetail
} from '../types';
import { databaseAPI } from './database-api';
import StorageService, { StorageKey } from '../utils/storage';
import { DEFAULT_APP_SETTINGS, mergeAppSettings } from '../utils/appSettings';

type RawSite = {
  key?: string;
  name?: string;
  type?: number;
  api?: string;
};

type ApiSource = {
  key: string;
  name: string;
  api: string;
  type: number;
  profileId: string;
  profileName: string;
  sourceWeight: number;
};

type SourceProfilePreset = {
  id: string;
  name: string;
  canonicalUrl: string;
  description: string;
  keywords: string[];
  /** 内置直采源：存在时直接使用，跳过远端片单抓取（仍会做可用性探测） */
  embeddedSources?: Omit<ApiSource, 'profileId' | 'profileName' | 'sourceWeight'>[];
};

type ResolvedProfile = SourceProfileSummary & {
  sources: ApiSource[];
  fallbackUsed: boolean;
};

type LooseJsonPayload = {
  sites?: RawSite[];
  urls?: Array<{ name?: string; url?: string }>;
};

const TVBOX_MULTI_URL = 'http://xhztv.top/dc/';
const SOURCE_CACHE_TTL = 1000 * 60 * 30;
// 片单缓存结构版本：升级源策略后递增，使旧缓存自动失效，避免沿用旧的（含死源/误判）结果
const PROFILE_CACHE_VERSION = 3;
// 源可用性探测：用一个高频关键词做一次轻量搜索，能返回合法 maccms JSON 即视为可用
const SOURCE_PROBE_KEYWORD = '爱';
const SOURCE_PROBE_TIMEOUT_MS = 8000;
const REQUEST_TIMEOUT_MS = 12000;
// 第三方采集站经常抖动，单个请求允许一次额外重试，提升命中率
const REQUEST_MAX_ATTEMPTS = 2;
const REQUEST_RETRY_DELAY_MS = 320;
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 FilmTrackPro';
const DEFAULT_HTTP_OPTIONS = {
  connectTimeout: REQUEST_TIMEOUT_MS,
  maxRedirections: 5
} as const;
const CONFIG_URL_PATTERN = /https?:\/\/[^\s"'<>]+/ig;
const DIRECT_MEDIA_URL_PATTERN = /\.(?:m3u8|mp4|flv|webm|mov|m4v|ts)(?:$|[?#])/i;

// 经实测可正常返回结果的常用 maccms 采集源（仍会在运行时做可用性探测，死源自动剔除）
const CURATED_API_SOURCES: Omit<ApiSource, 'profileId' | 'profileName' | 'sourceWeight'>[] = [
  { key: '量子@@https://cj.lziapi.com/api.php/provide/vod', name: '量子', api: 'https://cj.lziapi.com/api.php/provide/vod', type: 1 },
  { key: '非凡@@http://cj.ffzyapi.com/api.php/provide/vod', name: '非凡', api: 'http://cj.ffzyapi.com/api.php/provide/vod', type: 1 },
  { key: '360@@https://360zy.com/api.php/provide/vod', name: '360', api: 'https://360zy.com/api.php/provide/vod', type: 1 },
  { key: '魔都@@https://www.mdzyapi.com/api.php/provide/vod', name: '魔都', api: 'https://www.mdzyapi.com/api.php/provide/vod', type: 1 },
  { key: '如意@@https://cj.rycjapi.com/api.php/provide/vod', name: '如意', api: 'https://cj.rycjapi.com/api.php/provide/vod', type: 1 },
  { key: '暴風@@https://bfzyapi.com/api.php/provide/vod', name: '暴風', api: 'https://bfzyapi.com/api.php/provide/vod', type: 1 },
  { key: '豪华@@https://hhzyapi.com/api.php/provide/vod', name: '豪华', api: 'https://hhzyapi.com/api.php/provide/vod', type: 1 },
  { key: '光速@@https://api.guangsuapi.com/api.php/provide/vod', name: '光速', api: 'https://api.guangsuapi.com/api.php/provide/vod', type: 1 },
  { key: '极速@@https://jszyapi.com/api.php/provide/vod', name: '极速', api: 'https://jszyapi.com/api.php/provide/vod', type: 1 },
  { key: 'iku@@https://ikunzyapi.com/api.php/provide/vod', name: 'iku爱酷', api: 'https://ikunzyapi.com/api.php/provide/vod', type: 1 },
  { key: '无尽@@https://api.wujinapi.me/api.php/provide/vod', name: '无尽', api: 'https://api.wujinapi.me/api.php/provide/vod', type: 1 },
  { key: 'U酷@@https://api.ukuapi.com/api.php/provide/vod', name: 'U酷', api: 'https://api.ukuapi.com/api.php/provide/vod', type: 1 }
];

const PROFILE_PRESETS: SourceProfilePreset[] = [
  {
    id: 'jingxuan',
    name: '精选可用源',
    canonicalUrl: '',
    description: '内置常用采集源，自动探测可用性，仅保留可正常返回的线路。',
    keywords: [],
    embeddedSources: CURATED_API_SOURCES
  },
  {
    id: 'feimao',
    name: '肥猫',
    canonicalUrl: 'http://肥猫.com',
    description: '综合片单，线路状态会随上游变化。',
    keywords: ['肥猫']
  },
  {
    id: 'fantaiying',
    name: '饭太硬推荐',
    canonicalUrl: 'http://www.饭太硬.com/tv/',
    description: '常见推荐片单，部分线路当前可能不可用。',
    keywords: ['饭太硬']
  },
  {
    id: 'xiaohezi',
    name: '小盒子 4K',
    canonicalUrl: 'http://xhztv.top/4k.json',
    description: '偏高清资源，能否直连取决于上游返回。',
    keywords: ['小盒子']
  },
  {
    id: 'jiankang',
    name: '健康家用',
    canonicalUrl: 'https://gitlab.com/noimank/tvbox/-/raw/main/tvbox1.json',
    description: '家庭向片单，纯 API 源数量通常较少。',
    keywords: ['健康家用']
  },
  {
    id: 'wangerxiao',
    name: '王二小',
    canonicalUrl: 'http://tvbox.xn--4kq62z5rby2qupq9ub.top/',
    description: '综合入口片单，是否可用取决于远端状态。',
    keywords: ['王二小']
  },
  {
    id: 'fongmi',
    name: 'FongMI 线路',
    canonicalUrl: 'https://gh-proxy.com/raw.githubusercontent.com//gaotianliuyun/gao/master/0827.json',
    description: '当前默认片单，纯 API 可用性相对稳定。',
    keywords: ['FongMI', 'FongMI线路']
  }
];

// 兜底源直接复用经实测的精选源，避免再回退到已失效的旧源
const FALLBACK_SOURCES: Omit<ApiSource, 'profileId' | 'profileName' | 'sourceWeight'>[] = CURATED_API_SOURCES;

const SOURCE_WEIGHTS: Record<string, number> = {
  '量子': 7,
  '非凡': 6,
  '360': 6,
  '魔都': 6,
  '如意': 5,
  '暴風': 5,
  '豪华': 5,
  '光速': 5,
  '极速': 5,
  'iku爱酷': 4,
  '无尽': 4,
  'U酷': 4
};

let profileCache: { fetchedAt: number; items: ResolvedProfile[] } | null = null;
let remoteMapCache: { fetchedAt: number; map: Map<string, string> } | null = null;
const resolvedProfileCache = new Map<string, { fetchedAt: number; profile: ResolvedProfile }>();
type SourceHealthStatus = 'alive' | 'dead' | 'unknown';
const sourceHealthCache = new Map<string, { checkedAt: number; status: SourceHealthStatus }>();
let streamProxyBaseUrlPromise: Promise<string> | null = null;
// 片单后台静默刷新（SWR）：并发去重，避免多次打开设置触发重复的全量刷新
let backgroundProfileRefresh: Promise<ResolvedProfile[]> | null = null;
// 匹配结果短时缓存：同一影片（相同片单 / 画质策略）再次进入详情可秒开，免重搜
const MATCH_RESULT_TTL = 1000 * 60 * 10;
const matchResultCache = new Map<string, { fetchedAt: number; payload: MatchResponsePayload }>();
// 影片详情（剧集列表）短时缓存：来回切线路 / 再次进入时免重复拉取剧集清单
const VIDEO_DETAIL_TTL = 1000 * 60 * 10;
const videoDetailCache = new Map<string, { fetchedAt: number; detail: VideoDetail }>();

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function normalizeHttpUrl(value: string): string {
  const text = safeString(value).trim();
  if (!text) {
    return '';
  }

  try {
    return new URL(text).toString();
  } catch {
    return text;
  }
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s·:：\-_'".,，。!！?？/\\()[\]【】《》]/g, '')
    .trim();
}

function normalizeApiUrl(api: string): string {
  return normalizeHttpUrl(safeString(api).replace(/\/+$/, '').trim());
}

function extractJsonBody(text: string): string {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    throw new Error('返回内容为空');
  }
  if (trimmed.startsWith('<')) {
    const sitesMatchIndex = trimmed.search(/["']?sites["']?\s*:/i);
    if (sitesMatchIndex >= 0) {
      const firstBrace = trimmed.lastIndexOf('{', sitesMatchIndex);
      const lastBrace = trimmed.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        return trimmed.slice(firstBrace, lastBrace + 1);
      }
    }

    throw new Error('返回的是网页而不是片单 JSON');
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function stripNewlinesInsideStrings(text: string): string {
  let result = '';
  let inString = false;
  let quote = '';
  let escaped = false;
  let skipLeadingWhitespace = false;

  for (const char of text) {
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (inString) {
      if (char === '\\') {
        result += char;
        escaped = true;
        continue;
      }

      if (char === quote) {
        inString = false;
        quote = '';
        result += char;
        continue;
      }

      if (char === '\r' || char === '\n') {
        skipLeadingWhitespace = true;
        continue;
      }

      if (skipLeadingWhitespace) {
        if (char === ' ' || char === '\t') {
          continue;
        }
        skipLeadingWhitespace = false;
      }

      result += char;
      continue;
    }

    if (char === '"' || char === '\'') {
      inString = true;
      quote = char;
    }

    result += char;
  }

  return result;
}

function parseLooseJson<T>(text: string): T {
  const repairedText = stripNewlinesInsideStrings(text);
  const candidates = Array.from(
    new Set(
      [text, repairedText]
        .flatMap((candidate) => {
          const values = [candidate];
          try {
            values.push(extractJsonBody(candidate));
          } catch {
            // 保留原始候选继续尝试
          }
          return values;
        })
        .map((candidate) => candidate.trim())
        .filter(Boolean)
    )
  );
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      return JSON5.parse(candidate) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('片单解析失败');
}

function getAppSettings() {
  return mergeAppSettings(
    StorageService.get(StorageKey.SETTINGS, DEFAULT_APP_SETTINGS)
  );
}

function getVideoSettings(): SourceProfileSettings {
  return getAppSettings().videoSource;
}

function sourceWeightByName(name: string) {
  return SOURCE_WEIGHTS[name] ?? 3;
}

function looksLikeHtmlDocument(text: string) {
  const trimmed = safeString(text).trimStart();
  return trimmed.startsWith('<') || /<(?:!doctype|html|head|body)\b/i.test(trimmed.slice(0, 240));
}

function looksLikeConfigUrl(url: string) {
  const normalized = normalizeHttpUrl(url).toLowerCase();
  if (!/^https?:\/\//.test(normalized)) {
    return false;
  }

  if (/google(tagmanager|apis)\.com|cloudflare-static|rocket-loader|min\.js\b/.test(normalized)) {
    return false;
  }

  return /(?:\.json|\.txt|\.bmp)(?:$|[?#])/.test(normalized)
    || /\/tv(?:$|\/|\?)/.test(normalized)
    || /tvbox/.test(normalized)
    || /\/raw\//.test(normalized);
}

function extractConfigUrlsFromHtml(pageUrl: string, html: string) {
  const discovered = new Set<string>();

  const addCandidate = (rawValue: string) => {
    const candidate = safeString(rawValue).trim();
    if (!candidate) {
      return;
    }

    try {
      const resolved = normalizeHttpUrl(new URL(candidate, pageUrl).toString());
      if (resolved && resolved !== pageUrl && looksLikeConfigUrl(resolved)) {
        discovered.add(resolved);
      }
    } catch {
      // 忽略无效链接，继续尝试其他候选
    }
  };

  for (const match of html.matchAll(/data-clipboard-text=["']([^"']+)["']/ig)) {
    addCandidate(match[1] ?? '');
  }

  for (const match of html.matchAll(CONFIG_URL_PATTERN)) {
    addCandidate(match[0] ?? '');
  }

  return Array.from(discovered);
}

function resolveFallbackSources(profileId = 'fongmi', profileName = 'FongMI 线路'): ApiSource[] {
  return FALLBACK_SOURCES.map((item) => ({
    ...item,
    profileId,
    profileName,
    sourceWeight: sourceWeightByName(item.name)
  }));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof globalThis.setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = globalThis.setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer !== null) {
      globalThis.clearTimeout(timer);
    }
  }
}

function getDirectMediaContentType(target: string) {
  if (/\.m3u8($|[?#])/i.test(target)) {
    return 'application/vnd.apple.mpegurl';
  }
  if (/\.mp4($|[?#])/i.test(target)) {
    return 'video/mp4';
  }
  if (/\.webm($|[?#])/i.test(target)) {
    return 'video/webm';
  }
  if (/\.mov($|[?#])/i.test(target)) {
    return 'video/quicktime';
  }
  if (/\.flv($|[?#])/i.test(target)) {
    return 'video/x-flv';
  }
  if (/\.ts($|[?#])/i.test(target)) {
    return 'video/mp2t';
  }
  return '';
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function fetchTextOnce(url: string, headers?: Record<string, string>): Promise<string> {
  const normalizedUrl = normalizeHttpUrl(url);
  const response = await withTimeout(
    tauriFetch(normalizedUrl, {
      ...DEFAULT_HTTP_OPTIONS,
      headers: {
        'user-agent': DEFAULT_USER_AGENT,
        ...(headers ?? {})
      }
    }),
    REQUEST_TIMEOUT_MS,
    `请求超时: ${normalizedUrl}`
  );

  if (!response.ok) {
    throw new Error(`请求失败: ${normalizedUrl} [${response.status}]`);
  }

  return response.text();
}

async function fetchText(
  url: string,
  headers?: Record<string, string>,
  attempts: number = REQUEST_MAX_ATTEMPTS
): Promise<string> {
  let lastError: unknown = null;
  const total = Math.max(1, attempts);

  for (let attempt = 0; attempt < total; attempt += 1) {
    try {
      return await fetchTextOnce(url, headers);
    } catch (error) {
      lastError = error;
      if (attempt < total - 1) {
        await delay(REQUEST_RETRY_DELAY_MS);
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  // Tauri HTTP 失败时可能 reject 一个字符串而非 Error，保留真实原因便于定位
  throw new Error(typeof lastError === 'string' ? lastError : `请求失败: ${String(lastError)}`);
}

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const text = await fetchText(url, headers);
  return parseLooseJson<T>(text);
}

/**
 * 单次、短超时的文本抓取，用于源可用性探测。
 * 返回 { ok, status, text }：ok 表示 HTTP 2xx；status 为 HTTP 状态码（网络层错误为 0）。
 * 不抛错（除超时由 withTimeout 抛出），便于探测区分「明确不可用」与「未知」。
 */
async function probeFetch(url: string, timeoutMs: number): Promise<{ ok: boolean; status: number; text: string }> {
  const normalizedUrl = normalizeHttpUrl(url);
  const response = await withTimeout(
    tauriFetch(normalizedUrl, {
      ...DEFAULT_HTTP_OPTIONS,
      connectTimeout: timeoutMs,
      headers: { 'user-agent': DEFAULT_USER_AGENT }
    }),
    timeoutMs,
    `源探测超时: ${normalizedUrl}`
  );
  const text = response.ok ? await response.text() : '';
  return { ok: response.ok, status: response.status, text };
}

/**
 * 探测单个采集源健康度（三态，带缓存）：
 * - alive：返回了合法 maccms JSON（含 list 数组）
 * - dead：明确不可用（HTTP 4xx/5xx，或返回了非 maccms 内容）
 * - unknown：超时 / 网络层错误等不确定情况
 */
async function probeSourceHealth(source: ApiSource): Promise<SourceHealthStatus> {
  const cached = sourceHealthCache.get(source.key);
  if (cached && Date.now() - cached.checkedAt < SOURCE_CACHE_TTL) {
    return cached.status;
  }

  let status: SourceHealthStatus = 'unknown';
  try {
    const endpoint = buildApiUrl(source, '', { ac: 'detail', wd: SOURCE_PROBE_KEYWORD });
    const result = await probeFetch(endpoint, SOURCE_PROBE_TIMEOUT_MS);
    if (!result.ok) {
      status = 'dead';
    } else {
      try {
        const data = parseLooseJson<{ list?: unknown[] }>(result.text);
        status = Array.isArray(data.list) ? 'alive' : 'dead';
      } catch {
        status = 'dead';
      }
    }
  } catch {
    // 超时 / 网络层错误：不确定，按未知处理（fail-open）
    status = 'unknown';
  }

  sourceHealthCache.set(source.key, { checkedAt: Date.now(), status });
  return status;
}

/**
 * 并发探测并过滤采集源，仅剔除「明确不可用（dead）」的源；
 * 「未知（超时/网络抖动）」一律保留（fail-open），避免误杀好源导致整片单不可用。
 */
async function filterAliveSources(sources: ApiSource[]): Promise<ApiSource[]> {
  if (sources.length === 0) {
    return [];
  }
  const results = await Promise.all(
    sources.map(async (source) => ({ source, status: await probeSourceHealth(source) }))
  );
  const kept = results.filter((item) => item.status !== 'dead').map((item) => item.source);
  // 极端情况下（全部判为 dead）兜底返回原始列表，确保片单不至于整体不可用
  return kept.length > 0 ? kept : sources;
}

async function resolveMultiUrlMap() {
  if (remoteMapCache && Date.now() - remoteMapCache.fetchedAt < SOURCE_CACHE_TTL) {
    return remoteMapCache.map;
  }

  try {
    const text = await fetchText(TVBOX_MULTI_URL);
    const payload = parseLooseJson<LooseJsonPayload>(text);
    const map = new Map<string, string>();

    for (const item of payload.urls ?? []) {
      const name = safeString(item.name);
      const url = normalizeHttpUrl(safeString(item.url));
      if (name && url) {
        map.set(name, url);
      }
    }

    remoteMapCache = {
      fetchedAt: Date.now(),
      map
    };
    return map;
  } catch (error) {
    console.warn('拉取 tvboxmuti.json 失败，改用预设地址:', error);
    return new Map<string, string>();
  }
}

function resolveProfileUrl(preset: SourceProfilePreset, remoteMap: Map<string, string>) {
  for (const [name, url] of remoteMap.entries()) {
    if (preset.keywords.some((keyword) => name.includes(keyword))) {
      return normalizeHttpUrl(url);
    }
  }
  return normalizeHttpUrl(preset.canonicalUrl);
}

function extractApiSources(text: string, preset: SourceProfilePreset): ApiSource[] {
  const payload = parseLooseJson<LooseJsonPayload>(text);
  const sourceMap = new Map<string, ApiSource>();

  for (const site of payload.sites ?? []) {
    if (site.type !== 1 || !site.api || !site.key || !site.name) {
      continue;
    }

    const api = normalizeApiUrl(site.api);
    if (!/^https?:\/\//i.test(api)) {
      continue;
    }

    const key = `${site.key}@@${api}`;
    if (!sourceMap.has(key)) {
      sourceMap.set(key, {
        key,
        name: site.name,
        api,
        type: 1,
        profileId: preset.id,
        profileName: preset.name,
        sourceWeight: sourceWeightByName(site.name)
      });
    }
  }

  return Array.from(sourceMap.values());
}

async function resolveProfile(preset: SourceProfilePreset, remoteMap: Map<string, string>): Promise<ResolvedProfile> {
  // 内置直采源片单：直接做可用性探测后返回，不抓取远端片单
  if (preset.embeddedSources && preset.embeddedSources.length > 0) {
    const embedded = preset.embeddedSources.map((item) => ({
      ...item,
      profileId: preset.id,
      profileName: preset.name,
      sourceWeight: sourceWeightByName(item.name)
    }));
    const aliveSources = await filterAliveSources(embedded);
    return {
      id: preset.id,
      name: preset.name,
      url: preset.canonicalUrl || 'builtin',
      available: aliveSources.length > 0,
      sourceCount: aliveSources.length,
      description: preset.description,
      sources: aliveSources,
      fallbackUsed: false
    };
  }

  const initialUrl = resolveProfileUrl(preset, remoteMap);
  const pendingUrls = [initialUrl];
  const visitedUrls = new Set<string>();
  let lastError: Error | null = null;

  while (pendingUrls.length > 0 && visitedUrls.size < 12) {
    const candidateUrl = normalizeHttpUrl(pendingUrls.shift() ?? '');
    if (!candidateUrl || visitedUrls.has(candidateUrl)) {
      continue;
    }

    visitedUrls.add(candidateUrl);

    try {
      const text = await fetchText(candidateUrl);

      try {
        let sources = extractApiSources(text, preset);
        let fallbackUsed = false;

        if (preset.id === 'fongmi' && sources.length === 0) {
          sources = resolveFallbackSources(preset.id, preset.name);
          fallbackUsed = true;
        }

        if (sources.length > 0) {
          const aliveSources = await filterAliveSources(sources);
          if (aliveSources.length > 0) {
            return {
              id: preset.id,
              name: preset.name,
              url: candidateUrl,
              available: true,
              sourceCount: aliveSources.length,
              description: preset.description,
              sources: aliveSources,
              fallbackUsed
            };
          }
          if (!lastError) {
            lastError = new Error('解析出的采集源均不可用');
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('片单解析失败');
      }

      if (looksLikeHtmlDocument(text)) {
        const discoveredUrls = extractConfigUrlsFromHtml(candidateUrl, text);
        for (const discoveredUrl of discoveredUrls) {
          if (!visitedUrls.has(discoveredUrl)) {
            pendingUrls.push(discoveredUrl);
          }
        }

        if (discoveredUrls.length > 0) {
          continue;
        }
      }

      if (!lastError) {
        lastError = new Error('未从片单中解析出可用 API 源');
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('片单加载失败');
    }
  }

  if (preset.id === 'fongmi') {
    const aliveSources = await filterAliveSources(resolveFallbackSources(preset.id, preset.name));
    return {
      id: preset.id,
      name: preset.name,
      url: initialUrl,
      available: aliveSources.length > 0,
      sourceCount: aliveSources.length,
      description: preset.description,
      sources: aliveSources,
      fallbackUsed: true
    };
  }

  return {
    id: preset.id,
    name: preset.name,
    url: initialUrl,
    available: false,
    sourceCount: 0,
    description: preset.description,
    sources: [],
    fallbackUsed: false
  };
}

function readCachedProfiles(): ResolvedProfile[] | null {
  const cached = StorageService.get<{
    version?: number;
    fetchedAt: number;
    items: ResolvedProfile[];
  }>(StorageKey.SOURCE_PROFILES_CACHE);

  if (!cached || cached.version !== PROFILE_CACHE_VERSION) {
    return null;
  }

  if (Date.now() - cached.fetchedAt > SOURCE_CACHE_TTL) {
    return null;
  }

  return cached.items;
}

function writeCachedProfiles(items: ResolvedProfile[]) {
  StorageService.set(StorageKey.SOURCE_PROFILES_CACHE, {
    version: PROFILE_CACHE_VERSION,
    fetchedAt: Date.now(),
    items
  });
}

function writeResolvedProfile(profile: ResolvedProfile) {
  resolvedProfileCache.set(profile.id, {
    fetchedAt: Date.now(),
    profile
  });
}

function readResolvedProfile(profileId: string) {
  const cached = resolvedProfileCache.get(profileId);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.fetchedAt > SOURCE_CACHE_TTL) {
    resolvedProfileCache.delete(profileId);
    return null;
  }

  return cached.profile;
}

async function loadProfileById(profileId: string): Promise<ResolvedProfile | null> {
  if (profileCache && Date.now() - profileCache.fetchedAt < SOURCE_CACHE_TTL) {
    const matched = profileCache.items.find((item) => item.id === profileId) ?? null;
    if (matched) {
      return matched;
    }
  }

  const cached = readCachedProfiles();
  if (cached) {
    const matched = cached.find((item) => item.id === profileId) ?? null;
    if (matched) {
      writeResolvedProfile(matched);
      return matched;
    }
  }

  const resolved = readResolvedProfile(profileId);
  if (resolved) {
    return resolved;
  }

  const preset = PROFILE_PRESETS.find((item) => item.id === profileId);
  if (!preset) {
    return null;
  }

  const remoteMap = await resolveMultiUrlMap();
  const profile = await resolveProfile(preset, remoteMap);
  writeResolvedProfile(profile);
  return profile;
}

async function resolveAllProfiles(): Promise<ResolvedProfile[]> {
  const remoteMap = await resolveMultiUrlMap();
  const items = await Promise.all(PROFILE_PRESETS.map((preset) => resolveProfile(preset, remoteMap)));
  for (const item of items) {
    writeResolvedProfile(item);
  }
  profileCache = {
    fetchedAt: Date.now(),
    items
  };
  writeCachedProfiles(items);
  return items;
}

async function loadProfiles(): Promise<ResolvedProfile[]> {
  if (profileCache && Date.now() - profileCache.fetchedAt < SOURCE_CACHE_TTL) {
    return profileCache.items;
  }

  const cached = readCachedProfiles();
  if (cached) {
    profileCache = {
      fetchedAt: Date.now(),
      items: cached
    };
    return cached;
  }

  return resolveAllProfiles();
}

/** 读取持久化片单缓存（允许过期），用于 SWR：先展示旧数据，再后台刷新。 */
function readCachedProfilesRaw(): { fetchedAt: number; items: ResolvedProfile[] } | null {
  const cached = StorageService.get<{
    version?: number;
    fetchedAt: number;
    items: ResolvedProfile[];
  }>(StorageKey.SOURCE_PROFILES_CACHE);

  if (!cached || cached.version !== PROFILE_CACHE_VERSION || !Array.isArray(cached.items)) {
    return null;
  }

  return { fetchedAt: cached.fetchedAt, items: cached.items };
}

/** 首次无任何缓存时的占位骨架：片单名先可见、可用性标「检测中」，真实结果后台回填。 */
function buildSkeletonProfiles(): ResolvedProfile[] {
  return PROFILE_PRESETS.map((preset) => ({
    id: preset.id,
    name: preset.name,
    url: preset.canonicalUrl || 'builtin',
    available: false,
    sourceCount: 0,
    description: preset.description,
    sources: [],
    fallbackUsed: false
  }));
}

/** 后台静默全量刷新片单（并发去重）；失败时保留旧缓存，不打断使用。 */
function triggerBackgroundProfileRefresh(): Promise<ResolvedProfile[]> {
  if (backgroundProfileRefresh) {
    return backgroundProfileRefresh;
  }

  backgroundProfileRefresh = resolveAllProfiles()
    .catch((error) => {
      console.warn('片单后台刷新失败，保留旧缓存:', error);
      return profileCache?.items ?? [];
    })
    .finally(() => {
      backgroundProfileRefresh = null;
    });

  return backgroundProfileRefresh;
}

async function loadActiveProfile() {
  const settings = getVideoSettings();
  const preferredProfile = await loadProfileById(settings.activeProfileId);
  if (preferredProfile?.available) {
    return preferredProfile;
  }

  const cachedProfiles = profileCache?.items ?? readCachedProfiles();
  const cachedAvailable = cachedProfiles?.find((item) => item.available);
  if (cachedAvailable) {
    return cachedAvailable;
  }

  for (const preset of PROFILE_PRESETS) {
    if (preset.id === settings.activeProfileId) {
      continue;
    }

    const profile = await loadProfileById(preset.id);
    if (profile?.available) {
      return profile;
    }
  }

  if (preferredProfile) {
    return preferredProfile;
  }

  const profiles = await loadProfiles();
  return profiles.find((item) => item.available) ?? profiles[0];
}

async function loadSourceByKey(sourceKey: string) {
  const activeProfile = await loadActiveProfile();
  const activeMatch = activeProfile.sources.find((source) => source.key === sourceKey);
  if (activeMatch) {
    return activeMatch;
  }

  const cachedProfiles = profileCache?.items ?? readCachedProfiles();
  const cachedMatch = cachedProfiles?.flatMap((profile) => profile.sources).find((source) => source.key === sourceKey);
  if (cachedMatch) {
    return cachedMatch;
  }

  for (const preset of PROFILE_PRESETS) {
    if (preset.id === activeProfile.id) {
      continue;
    }

    const profile = await loadProfileById(preset.id);
    const match = profile?.sources.find((source) => source.key === sourceKey);
    if (match) {
      return match;
    }
  }

  return null;
}

function buildApiUrl(source: ApiSource, pathname: string, params: Record<string, string>) {
  const url = new URL(normalizeHttpUrl(`${source.api}${pathname}`));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function normalizeSearchList(payload: unknown) {
  const raw = payload as { list?: Array<Record<string, unknown>> };
  return raw.list ?? [];
}

async function searchSource(source: ApiSource, keyword: string) {
  const endpoints = [
    buildApiUrl(source, '/search', { wd: keyword }),
    buildApiUrl(source, '', { ac: 'detail', wd: keyword })
  ];

  for (const endpoint of endpoints) {
    try {
      const data = await fetchJson<{ list?: Array<Record<string, unknown>> }>(endpoint);
      const list = normalizeSearchList(data);
      if (list.length === 0) {
        continue;
      }

      return list
        .slice(0, 6)
        .map((item) => ({
          sourceKey: source.key,
          sourceName: source.name,
          vodId: safeString(item.vod_id),
          vodName: safeString(item.vod_name),
          vodPic: safeString(item.vod_pic),
          vodRemarks: safeString(item.vod_remarks),
          profileId: source.profileId,
          profileName: source.profileName
        }))
        .filter((item) => item.vodId && item.vodName);
    } catch {
      continue;
    }
  }

  return [];
}

function scoreTitle(title: string, candidate: string) {
  const base = normalizeText(title);
  const target = normalizeText(candidate);
  if (!base || !target) {
    return 0;
  }
  if (base === target) {
    return 92;
  }
  if (target.includes(base) || base.includes(target)) {
    const extraLength = Math.abs(target.length - base.length);
    return Math.max(34, 72 - extraLength * 4);
  }

  const baseChars = new Set(base.split(''));
  const targetChars = new Set(target.split(''));
  const overlap = Array.from(baseChars).filter((char) => targetChars.has(char)).length;
  return Math.round((overlap / Math.max(baseChars.size, 1)) * 30);
}

function titleNoisePenalty(candidate: string, mediaType: MatchContext['mediaType']) {
  const text = safeString(candidate);
  let penalty = 0;

  if (/解说|说电影|说剧|预告|花絮|特别篇|番外|合集|速看|看完|剪辑|混剪|盘点|拆解|讲解|reaction|点评/i.test(text)) {
    penalty += mediaType === 'tv' ? 96 : 84;
  }
  if (/剧版|重制版/.test(text)) {
    penalty += 12;
  }
  if (mediaType === 'tv' && /电影解说|影视解说|剧情解说|动漫解说|短剧|竖屏|切片/.test(text)) {
    penalty += 48;
  }

  return penalty;
}

function qualityMetrics(text: string) {
  const upper = text.toUpperCase();
  if (/4K|2160|UHD/.test(upper)) {
    return { label: '4K', score: 30 };
  }
  if (/蓝光|BLURAY|BD/.test(upper)) {
    return { label: '蓝光', score: 26 };
  }
  if (/1080/.test(upper)) {
    return { label: '1080P', score: 22 };
  }
  if (/超清/.test(text)) {
    return { label: '超清', score: 18 };
  }
  if (/高清|HD/.test(upper)) {
    return { label: '高清', score: 12 };
  }
  if (/抢先|枪版|TC|TS|CAM/.test(upper)) {
    return { label: '抢先版', score: -12 };
  }
  if (/完结|全集/.test(text)) {
    return { label: '全集', score: 10 };
  }
  const matched = text.match(/更新至?(\d+)/);
  if (matched) {
    return { label: `更新至 ${matched[1]}`, score: 9 };
  }
  return { label: '片源待确认', score: 4 };
}

function updateMetrics(text: string) {
  if (/完结|全集/.test(text)) {
    return 18;
  }
  const matched = text.match(/更新至?(\d+)/);
  if (matched) {
    return Math.min(Number(matched[1]) || 0, 16);
  }
  return 4;
}

function scoreSearchHit(
  hit: Omit<SearchHit, 'qualityLabel' | 'score'>,
  context: MatchContext,
  source: ApiSource
): SearchHit {
  const settings = getVideoSettings();
  const quality = qualityMetrics(`${hit.vodRemarks} ${hit.vodName} ${hit.sourceName}`);
  const updateScore = updateMetrics(hit.vodRemarks || '');
  const titleScore = Math.max(
    scoreTitle(context.title, hit.vodName),
    scoreTitle(safeString(context.originalTitle), hit.vodName)
  );
  const yearText = safeString(context.year);
  const yearScore = yearText && hit.vodRemarks.includes(yearText) ? 10 : 0;
  const noisePenalty = titleNoisePenalty(hit.vodName, context.mediaType);

  let score = titleScore + yearScore + source.sourceWeight - noisePenalty;
  if (settings.qualityPriority === 'quality') {
    score += quality.score * 1.3 + updateScore * 0.4;
  } else if (settings.qualityPriority === 'update') {
    score += quality.score * 0.5 + updateScore * 1.5;
  } else {
    score += quality.score + updateScore;
  }

  return {
    ...hit,
    qualityLabel: quality.label,
    score: Math.round(score)
  };
}

function dedupeCandidates(items: SearchHit[]) {
  const map = new Map<string, SearchHit>();
  for (const item of items) {
    const key = `${item.sourceKey}@@${item.vodId}`;
    const current = map.get(key);
    if (!current || current.score < item.score) {
      map.set(key, item);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

function groupDirectPlayableScore(episodes: Array<{ url: string }>): number {
  if (episodes.length === 0) {
    return 0;
  }
  const sample = episodes.slice(0, 4);
  const direct = sample.filter((item) => DIRECT_MEDIA_URL_PATTERN.test(item.url)).length;
  return direct / sample.length;
}

export function parsePlayGroups(playFrom: string, playUrl: string) {
  const groupNames = playFrom.split('$$$');
  const groupUrls = playUrl.split('$$$');

  const groups = groupNames
    .map((name, index) => {
      const episodesRaw = groupUrls[index] || '';
      const episodes = episodesRaw
        .split('#')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const [episodeName, episodeUrl] = item.split('$');
          return {
            name: episodeUrl ? episodeName : item,
            url: episodeUrl || episodeName
          };
        })
        .filter((item) => /^https?:\/\//i.test(item.url));

      return {
        name,
        episodes
      };
    })
    .filter((group) => group.episodes.length > 0);

  // 可直链播放（m3u8/mp4 等）的线路排前面，share 类播放页线路靠后，
  // 让自动选源优先落在能内嵌直播的线路上。
  return groups
    .map((group, index) => ({
      group,
      index,
      score: groupDirectPlayableScore(group.episodes)
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.group);
}

function extractPlayableUrlFromHtml(target: string, html: string) {
  const normalizedTarget = normalizeHttpUrl(target);
  const normalizedHtml = html.replace(/\\\//g, '/');
  const patterns = [
    /const\s+url\s*=\s*"([^"]+\.(?:m3u8|mp4|flv|webm|mov)[^"]*)"/i,
    /var\s+main\s*=\s*"([^"]+\.(?:m3u8|mp4|flv|webm|mov)[^"]*)"/i,
    /var\s+url\s*=\s*"([^"]+\.(?:m3u8|mp4|flv|webm|mov)[^"]*)"/i,
    /"url"\s*:\s*"([^"]+\.(?:m3u8|mp4|flv|webm|mov)[^"]*)"/i,
    /(?:src|video|play)\s*[:=]\s*"([^"]+\.(?:m3u8|mp4|flv|webm|mov)[^"]*)"/i,
    /(?:https?:)?\/\/[^"'\\\s]+\.(?:m3u8|mp4|flv|webm|mov)(?:\?[^"'\\\s]*)?/i
  ];

  for (const pattern of patterns) {
    const matched = normalizedHtml.match(pattern);
    const candidate = matched?.[1] ?? matched?.[0];
    if (candidate) {
      return normalizeHttpUrl(new URL(candidate, normalizedTarget).toString());
    }
  }

  return null;
}

function buildStreamRequestHeaders(target: string, refererUrl?: string) {
  const normalizedTarget = normalizeHttpUrl(target);
  const fallbackOrigin = new URL(normalizedTarget).origin;
  const referer = normalizeHttpUrl(safeString(refererUrl).trim()) || `${fallbackOrigin}/`;
  let origin = fallbackOrigin;

  try {
    origin = new URL(referer).origin;
  } catch {
    origin = fallbackOrigin;
  }

  return {
    referer,
    origin,
    'user-agent': DEFAULT_USER_AGENT
  };
}

function isHlsStream(target: string, contentType: string) {
  return contentType.includes('application/vnd.apple.mpegurl') || /\.m3u8($|\?)/i.test(target);
}

function buildProfilesResponse(items: ResolvedProfile[]) {
  return {
    items: items.map(({ sources, fallbackUsed, ...rest }) => rest),
    settings: getVideoSettings()
  };
}

/**
 * 获取片单列表（SWR：stale-while-revalidate）。
 * - 命中新鲜缓存：直接返回；
 * - 命中过期缓存：立即返回旧数据展示，同时后台静默刷新（下次即新）；
 * - 完全无缓存：先返回内置骨架即时展示，真实可用性后台探测后由调用方回填。
 * 避免设置弹窗在冷/过期缓存时长时间空白等待。
 */
export async function getSourceProfiles() {
  if (profileCache && Date.now() - profileCache.fetchedAt < SOURCE_CACHE_TTL) {
    return buildProfilesResponse(profileCache.items);
  }

  const persisted = readCachedProfilesRaw();
  if (persisted && persisted.items.length > 0) {
    const isStale = Date.now() - persisted.fetchedAt >= SOURCE_CACHE_TTL;
    if (isStale) {
      void triggerBackgroundProfileRefresh();
    } else {
      profileCache = { fetchedAt: persisted.fetchedAt, items: persisted.items };
    }
    return buildProfilesResponse(persisted.items);
  }

  void triggerBackgroundProfileRefresh();
  return buildProfilesResponse(buildSkeletonProfiles());
}

/**
 * 若片单正在后台刷新，返回其 Promise（用于调用方在刷新完成后静默回填 UI）；
 * 没有进行中的刷新时返回 null。
 */
export function whenSourceProfilesRefreshed(): Promise<void> | null {
  if (!backgroundProfileRefresh) {
    return null;
  }
  return backgroundProfileRefresh.then(() => undefined);
}

export async function refreshSourceProfiles() {
  profileCache = null;
  remoteMapCache = null;
  resolvedProfileCache.clear();
  sourceHealthCache.clear();
  matchResultCache.clear();
  videoDetailCache.clear();
  StorageService.remove(StorageKey.SOURCE_PROFILES_CACHE);
  // 显式强制刷新：等待真正的全量解析完成后返回新数据（区别于 SWR 的即时返回）
  const items = await resolveAllProfiles();
  return buildProfilesResponse(items);
}

export function updateVideoSourceSettings(next: Partial<SourceProfileSettings>) {
  const current = getAppSettings();
  const updated = mergeAppSettings({
    ...current,
    videoSource: {
      ...current.videoSource,
      ...next
    }
  });
  StorageService.set(StorageKey.SETTINGS, updated);
  return updated.videoSource;
}

/**
 * 去掉季/部/年份/括号等噪声，得到更易命中采集站的基础关键词。
 * 例：「凡人修仙传 第二季 (2023)」→「凡人修仙传」。
 */
export function simplifyKeyword(title: string): string {
  return safeString(title)
    .replace(/第\s*[0-9一二三四五六七八九十百零两]+\s*[季部篇章]/g, ' ')
    .replace(/\bseason\s*\d+\b/gi, ' ')
    .replace(/\bpart\s*\d+\b/gi, ' ')
    .replace(/[（(][^（）()]*[）)]/g, ' ')
    .replace(/\s*(?:19|20)\d{2}\s*$/g, ' ')
    .replace(/[\s·・]+/g, ' ')
    .trim();
}

/**
 * 构建搜索关键词列表：始终包含标题与原始标题，并补充去噪后的兜底关键词。
 * 顺序即优先级，靠前的先用于匹配。
 */
function buildSearchKeywords(context: MatchContext): { always: string[]; fallback: string[] } {
  const seen = new Set<string>();
  const always: string[] = [];
  const fallback: string[] = [];

  const push = (value: string | undefined, bucket: string[]) => {
    const keyword = safeString(value).trim();
    if (!keyword) {
      return;
    }
    const norm = normalizeText(keyword);
    if (!norm || seen.has(norm)) {
      return;
    }
    seen.add(norm);
    bucket.push(keyword);
  };

  // 始终用标题 + 原始标题（中文 / 原名都搜一遍）
  push(context.title, always);
  push(context.originalTitle, always);

  // 去季 / 年份 / 括号后缀作为兜底关键词
  push(simplifyKeyword(context.title), fallback);
  push(simplifyKeyword(context.originalTitle), fallback);

  return { always, fallback };
}

async function searchKeywordAcrossSources(
  profile: ResolvedProfile,
  keyword: string,
  context: MatchContext
): Promise<SearchHit[]> {
  const settled = await Promise.allSettled(
    profile.sources.map((source) => searchSource(source, keyword))
  );

  return settled
    .filter((item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof searchSource>>> => item.status === 'fulfilled')
    .flatMap((item) => item.value)
    .map((item) => {
      const source = profile.sources.find((candidate) => candidate.key === item.sourceKey);
      if (!source) {
        return null;
      }
      return scoreSearchHit(item, context, source);
    })
    .filter((item): item is SearchHit => item !== null);
}

/** 匹配缓存键：同一影片 + 片单 + 画质策略 视为同一次匹配，可复用结果。 */
function buildMatchCacheKey(context: MatchContext, profileId: string): string {
  const settings = getVideoSettings();
  return [context.movieId || context.title, profileId, settings.qualityPriority].join('::');
}

export async function matchMovieSources(context: MatchContext): Promise<MatchResponsePayload> {
  const profile = await loadActiveProfile();

  // C：同一影片（相同片单 / 画质策略）短时命中缓存，再次进入详情秒开、免重搜
  const cacheKey = buildMatchCacheKey(context, profile.id);
  const cached = matchResultCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < MATCH_RESULT_TTL) {
    return cached.payload;
  }

  const { always, fallback } = buildSearchKeywords(context);
  const primaryKeyword = always[0] ?? context.title.trim();

  // B：标题 + 原始标题两轮搜索并行（此前串行，需等第一轮最慢源结束才开始第二轮）
  const alwaysResults = await Promise.all(
    always.map((keyword) => searchKeywordAcrossSources(profile, keyword, context))
  );
  let hits: SearchHit[] = alwaysResults.flat();

  // 命中偏少时，再用去噪后的兜底关键词并行补搜
  if (dedupeCandidates(hits).length < 6 && fallback.length > 0) {
    const fallbackResults = await Promise.all(
      fallback.map((keyword) => searchKeywordAcrossSources(profile, keyword, context))
    );
    hits = hits.concat(fallbackResults.flat());
  }

  const candidates = dedupeCandidates(hits);

  const payload: MatchResponsePayload = {
    keyword: primaryKeyword,
    candidates: candidates.slice(0, 24),
    autoSelected: candidates[0] ?? null,
    sourceCount: profile.sourceCount,
    resolvedProfileId: profile.id,
    resolvedProfileName: profile.name,
    fallbackUsed: profile.fallbackUsed
  };

  // 仅缓存「有候选」的结果：避免把「暂时没搜到」也缓存住，导致一直为空无法自愈
  if (payload.candidates.length > 0) {
    matchResultCache.set(cacheKey, { fetchedAt: Date.now(), payload });
  }

  return payload;
}

export async function loadVideoDetail(sourceKey: string, vodId: string): Promise<VideoDetail> {
  // C/D：剧集清单短时缓存，避免来回切线路 / 再次进入时重复拉取
  const detailCacheKey = `${sourceKey}::${vodId}`;
  const cachedDetail = videoDetailCache.get(detailCacheKey);
  if (cachedDetail && Date.now() - cachedDetail.fetchedAt < VIDEO_DETAIL_TTL) {
    return cachedDetail.detail;
  }

  const source = await loadSourceByKey(sourceKey);
  if (!source) {
    throw new Error('片源不存在');
  }

  const endpoints = [
    buildApiUrl(source, '/detail', { vod_id: vodId }),
    buildApiUrl(source, '', { ac: 'detail', ids: vodId }),
    buildApiUrl(source, '', { ac: 'videolist', ids: vodId })
  ];

  for (const endpoint of endpoints) {
    try {
      const data = await fetchJson<{ list?: Array<Record<string, unknown>> }>(endpoint);
      const item = data.list?.[0];
      if (!item) {
        continue;
      }

      const sources = parsePlayGroups(
        safeString(item.vod_play_from),
        safeString(item.vod_play_url)
      );

      if (sources.length === 0) {
        continue;
      }

      const detail: VideoDetail = {
        sourceKey: source.key,
        sourceName: source.name,
        vodId,
        vodName: safeString(item.vod_name),
        vodPic: safeString(item.vod_pic),
        vodContent: safeString(item.vod_content),
        year: safeString(item.vod_year),
        area: safeString(item.vod_area),
        director: safeString(item.vod_director),
        actor: safeString(item.vod_actor),
        profileId: source.profileId,
        profileName: source.profileName,
        qualityLabel: qualityMetrics(`${safeString(item.vod_remarks)} ${safeString(item.vod_name)}`).label,
        score: source.sourceWeight,
        sources
      };

      videoDetailCache.set(detailCacheKey, { fetchedAt: Date.now(), detail });
      return detail;
    } catch {
      continue;
    }
  }

  throw new Error(`未找到可播放详情: ${source.name}`);
}

export async function savePlaybackProgress(payload: PlaybackProgressPayload) {
  return databaseAPI.savePlaybackProgress(payload);
}

export async function getLatestPlaybackProgress(movieId: string) {
  return databaseAPI.getLatestPlaybackProgress(movieId);
}

export async function getPlaybackProgressByEpisode(movieId: string, sourceKey: string, episodeUrl: string) {
  return databaseAPI.getPlaybackProgressByEpisode(movieId, sourceKey, episodeUrl);
}

export async function saveMovieSourcePreference(movie: Movie) {
  return databaseAPI.updateMovie(movie);
}

async function resolveVideoStreamInternal(target: string, refererUrl?: string): Promise<ResolvedVideoStream> {
  const normalizedTarget = normalizeHttpUrl(target);
  const requestHeaders = buildStreamRequestHeaders(normalizedTarget, refererUrl);
  const guessedContentType = getDirectMediaContentType(normalizedTarget);
  if (DIRECT_MEDIA_URL_PATTERN.test(normalizedTarget)) {
    return {
      url: normalizedTarget,
      contentType: guessedContentType,
      directPlayable: !isHlsStream(normalizedTarget, guessedContentType),
      requestHeaders,
      resolvedFromUrl: refererUrl ?? normalizedTarget
    };
  }

  const response = await withTimeout(
    tauriFetch(normalizedTarget, {
      ...DEFAULT_HTTP_OPTIONS,
      headers: requestHeaders
    }),
    REQUEST_TIMEOUT_MS,
    `拉流超时: ${normalizedTarget}`
  );

  if (!response.ok) {
    throw new Error(`拉流失败: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || guessedContentType;
  if (contentType.includes('text/html')) {
    const html = await response.text();
    const resolvedPlayable = extractPlayableUrlFromHtml(normalizedTarget, html);
    if (resolvedPlayable) {
      return resolveVideoStreamInternal(resolvedPlayable, normalizedTarget);
    }

    throw new Error('当前片源返回的是网页，未解析出真实视频地址');
  }

  return {
    url: normalizedTarget,
    contentType,
    directPlayable: !isHlsStream(normalizedTarget, contentType),
    requestHeaders,
    resolvedFromUrl: refererUrl ?? normalizedTarget
  };
}

export async function resolveVideoStream(target: string): Promise<ResolvedVideoStream> {
  return resolveVideoStreamInternal(target);
}

function encodeProxyPayload(payload: Record<string, unknown>) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function getStreamProxyBaseUrl() {
  if (!streamProxyBaseUrlPromise) {
    streamProxyBaseUrlPromise = invoke<string>('get_stream_proxy_base_url');
  }
  return streamProxyBaseUrlPromise;
}

export async function createStreamProxyUrl(
  target: string,
  headers?: Record<string, string>,
  contentType?: string,
  cacheKey?: string
) {
  const normalizedTarget = normalizeHttpUrl(target);
  const baseUrl = await getStreamProxyBaseUrl();
  const payload = encodeProxyPayload({
    target: normalizedTarget,
    headers: headers ?? {},
    contentType: contentType ?? ''
  });
  const proxyUrl = `${baseUrl.replace(/\/+$/, '')}/${payload}`;

  if (!cacheKey) {
    return proxyUrl;
  }

  const delimiter = proxyUrl.includes('?') ? '&' : '?';
  return `${proxyUrl}${delimiter}v=${encodeURIComponent(cacheKey)}`;
}

/** 仅供测试：暴露纯函数内部实现（缓存键、骨架片单），便于做不依赖网络的断言。 */
export const __videoSourceInternals = {
  buildSkeletonProfiles,
  buildMatchCacheKey,
  profilePresetCount: PROFILE_PRESETS.length,
  profilePresetIds: PROFILE_PRESETS.map((preset) => preset.id)
};
