/**
 * 桌面通知服务
 *
 * - 封装 `@tauri-apps/plugin-notification` 的权限申请
 * - 仅在 Tauri 环境内可用；浏览器/SSR 调用会被自动跳过
 * - 用 localStorage 做"按 key+日期"去重，避免每次启动重复推送
 */

interface NotifyKeyOptions {
  /** 用来去重的 key，例如 `tv-airdate-2026-06-08-{tmdbId}` */
  key: string;
  /** 同一 key 在该自然日内不再重复推送，默认 'YYYY-MM-DD' */
  bucket?: string;
}

const STORAGE_PREFIX = 'desktop-notification:';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const shouldSend = (opts: NotifyKeyOptions) => {
  const bucket = opts.bucket ?? today();
  const storageKey = `${STORAGE_PREFIX}${opts.key}`;
  try {
    const last = window.localStorage.getItem(storageKey);
    if (last === bucket) return false;
    window.localStorage.setItem(storageKey, bucket);
    return true;
  } catch {
    return true;
  }
};

let cachedPermission: 'granted' | 'denied' | null = null;

/**
 * 确保已获得通知权限。
 * - 已授权：直接返回 true
 * - 未授权：发起一次请求；用户拒绝后本进程内不再重复请求
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isTauri()) return false;
  if (cachedPermission === 'granted') return true;
  if (cachedPermission === 'denied') return false;
  try {
    const mod = await import('@tauri-apps/plugin-notification');
    const granted = await mod.isPermissionGranted();
    if (granted) {
      cachedPermission = 'granted';
      return true;
    }
    const result = await mod.requestPermission();
    if (result === 'granted') {
      cachedPermission = 'granted';
      return true;
    }
    cachedPermission = 'denied';
    return false;
  } catch (error) {
    console.warn('请求通知权限失败:', error);
    cachedPermission = 'denied';
    return false;
  }
}

export interface SendOptions extends NotifyKeyOptions {
  title: string;
  body: string;
}

/**
 * 发送桌面通知（带去重）。返回是否实际触发。
 */
export async function sendDesktopNotification(options: SendOptions): Promise<boolean> {
  if (!isTauri()) return false;
  if (!shouldSend(options)) return false;
  const granted = await ensureNotificationPermission();
  if (!granted) return false;
  try {
    const { sendNotification } = await import('@tauri-apps/plugin-notification');
    sendNotification({ title: options.title, body: options.body });
    return true;
  } catch (error) {
    console.warn('发送桌面通知失败:', error);
    return false;
  }
}
