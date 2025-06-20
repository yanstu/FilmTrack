/**
 * 浏览器行为控制工具
 * 用于禁用右键菜单和限制浏览器特征
 */

/**
 * 禁用右键菜单
 */
export function disableContextMenu(): void {
  // 禁用右键菜单
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
}

/**
 * 限制浏览器特征
 * 开发环境下仅支持F5和F12
 * 生产环境禁止任何浏览器快捷键特征
 */
export function limitBrowserFeatures(): void {
  // 判断是否为开发环境
  const isDev = import.meta.env.DEV;
  
  // 监听键盘事件
  document.addEventListener('keydown', (e) => {
    // 开发环境下允许F5和F12
    if (isDev) {
      if (e.key === 'F5' || e.key === 'F12') {
        return true;
      }
    }
    
    // 禁用浏览器快捷键
    if ((e.ctrlKey || e.metaKey) && 
        (e.key === 'r' || // 刷新
         e.key === 'u' || // 查看源代码
         e.key === 'i' || // 开发者工具
         e.key === 'p' || // 打印
         e.key === 's' || // 保存
         e.key === 'o' || // 打开文件
         e.key === 'h' || // 历史记录
         e.key === 'j' || // 下载
         e.key === 'n' || // 新窗口
         e.key === 'w' || // 关闭窗口
         e.key === 't' || // 新标签页
         e.key === '+' || // 放大
         e.key === '-' || // 缩小
         e.key === '0')) { // 重置缩放
      e.preventDefault();
      return false;
    }
    
    // 生产环境下禁用所有功能键
    if (!isDev && (e.key.startsWith('F') || e.altKey)) {
      e.preventDefault();
      return false;
    }
  });
}

/**
 * 初始化浏览器行为控制
 */
export function initBrowserControl(): void {
  // 禁用右键菜单（开发环境和生产环境都禁用）
  disableContextMenu();
  
  // 限制浏览器特征
  limitBrowserFeatures();
} 