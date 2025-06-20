/**
 * 模糊搜索工具
 * 支持拼音首字母、部分匹配等功能
 */

import { pinyin } from 'pinyin-pro';

/**
 * 搜索配置选项
 */
export interface SearchOptions {
  /** 是否启用拼音首字母搜索 */
  enablePinyin?: boolean;
  /** 是否区分大小写 */
  caseSensitive?: boolean;
  /** 最小搜索长度 */
  minLength?: number;
  /** 搜索字段 */
  searchFields?: string[];
}

/**
 * 搜索结果项
 */
export interface SearchResult<T> {
  item: T;
  score: number;
  matches: string[];
}

/**
 * 默认搜索配置
 */
const defaultOptions: Required<SearchOptions> = {
  enablePinyin: true,
  caseSensitive: false,
  minLength: 1,
  searchFields: []
};

/**
 * 获取字符串的拼音首字母
 */
export function getPinyinInitials(text: string): string {
  try {
    return pinyin(text, { 
      toneType: 'none', 
      type: 'array',
      v: true 
    })
    .map((item: string) => item.charAt(0).toLowerCase())
    .join('');
  } catch (error) {
    console.warn('获取拼音首字母失败:', error);
    return '';
  }
}

/**
 * 获取完整拼音
 */
export function getFullPinyin(text: string): string {
  try {
    return pinyin(text, { 
      toneType: 'none', 
      separator: '',
      v: true 
    }).toLowerCase();
  } catch (error) {
    console.warn('获取完整拼音失败:', error);
    return '';
  }
}

/**
 * 计算字符串相似度分数
 */
function calculateScore(query: string, target: string, matchType: 'exact' | 'partial' | 'pinyin' | 'initials'): number {
  const baseScore = {
    exact: 100,
    partial: 80,
    pinyin: 60,
    initials: 40
  };
  
  const lengthPenalty = Math.abs(query.length - target.length) * 2;
  return Math.max(0, baseScore[matchType] - lengthPenalty);
}

/**
 * 检查是否匹配
 */
function isMatch(
  query: string, 
  target: string, 
  options: Required<SearchOptions>
): { isMatch: boolean; score: number; matchType: string } {
  if (!query || query.length < options.minLength) {
    return { isMatch: false, score: 0, matchType: '' };
  }

  const normalizedQuery = options.caseSensitive ? query : query.toLowerCase();
  const normalizedTarget = options.caseSensitive ? target : target.toLowerCase();

  // 1. 精确匹配
  if (normalizedTarget === normalizedQuery) {
    return { isMatch: true, score: calculateScore(query, target, 'exact'), matchType: 'exact' };
  }

  // 2. 部分匹配
  if (normalizedTarget.includes(normalizedQuery)) {
    return { isMatch: true, score: calculateScore(query, target, 'partial'), matchType: 'partial' };
  }

  // 3. 拼音匹配（如果启用）
  if (options.enablePinyin) {
    const fullPinyin = getFullPinyin(target);
    if (fullPinyin && fullPinyin.includes(normalizedQuery)) {
      return { isMatch: true, score: calculateScore(query, target, 'pinyin'), matchType: 'pinyin' };
    }

    // 4. 拼音首字母匹配
    const pinyinInitials = getPinyinInitials(target);
    if (pinyinInitials && pinyinInitials.includes(normalizedQuery)) {
      return { isMatch: true, score: calculateScore(query, target, 'initials'), matchType: 'initials' };
    }
  }

  return { isMatch: false, score: 0, matchType: '' };
}

/**
 * 从对象中提取搜索文本
 */
function extractSearchText<T>(item: T, fields: string[]): string[] {
  if (fields.length === 0) {
    // 如果没有指定字段，尝试从常见字段提取
    const commonFields = ['title', 'name', 'chinese_title', 'original_title'];
    return commonFields
      .map(field => {
        const value = (item as any)[field];
        return typeof value === 'string' ? value : '';
      })
      .filter(Boolean);
  }

  return fields
    .map(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], item as any);
      return typeof value === 'string' ? value : '';
    })
    .filter(Boolean);
}

/**
 * 模糊搜索函数
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  options: SearchOptions = {}
): SearchResult<T>[] {
  const config = { ...defaultOptions, ...options };
  
  if (!query || query.trim().length < config.minLength) {
    return items.map(item => ({ item, score: 0, matches: [] }));
  }

  const results: SearchResult<T>[] = [];

  for (const item of items) {
    const searchTexts = extractSearchText(item, config.searchFields);
    let bestScore = 0;
    const matches: string[] = [];

    for (const text of searchTexts) {
      const matchResult = isMatch(query.trim(), text, config);
      if (matchResult.isMatch) {
        matches.push(`${text} (${matchResult.matchType})`);
        bestScore = Math.max(bestScore, matchResult.score);
      }
    }

    if (bestScore > 0 || matches.length > 0 || !query.trim()) {
      results.push({
        item,
        score: bestScore,
        matches
      });
    }
  }

  // 按分数排序，分数高的在前
  return results.sort((a, b) => b.score - a.score);
}

/**
 * 高亮匹配文本
 */
export function highlightMatch(text: string, query: string, enablePinyin = true): string {
  if (!query || !text) return text;

  const normalizedQuery = query.toLowerCase();
  const normalizedText = text.toLowerCase();

  // 直接文本匹配
  if (normalizedText.includes(normalizedQuery)) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // 拼音匹配高亮（简化处理）
  if (enablePinyin) {
    try {
      const fullPinyin = getFullPinyin(text);
      if (fullPinyin && fullPinyin.includes(normalizedQuery)) {
        return `<mark>${text}</mark>`;
      }
    } catch (error) {
      // 拼音高亮失败时静默处理
    }
  }

  return text;
} 