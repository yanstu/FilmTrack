/**
 * 运行平台检测工具
 * 基于 webview 的 navigator 信息判断当前桌面平台，
 * 用于在前端做平台相关的 UI / 行为适配（如 macOS 原生标题栏、更新流程）。
 * @author yanstu
 */

function getNavigatorInfo(): { platform: string; userAgent: string } {
  if (typeof navigator === 'undefined') {
    return { platform: '', userAgent: '' };
  }
  return {
    platform: (navigator.platform || '').toLowerCase(),
    userAgent: (navigator.userAgent || '').toLowerCase()
  };
}

/** 是否为 macOS */
export function isMacOS(): boolean {
  const { platform, userAgent } = getNavigatorInfo();
  return platform.includes('mac') || userAgent.includes('mac os');
}

/** 是否为 Windows */
export function isWindows(): boolean {
  const { platform, userAgent } = getNavigatorInfo();
  return platform.includes('win') || userAgent.includes('windows');
}
