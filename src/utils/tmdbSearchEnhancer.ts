/**
 * TMDb 搜索增强工具
 * 专门用于提高中文影视作品的搜索成功率
 */

import { generateSearchVariants } from './titleUtils';
import type { TMDbMovie, TMDbResponse, RelevanceScoreResult } from '../types';

/**
 * 生成针对 TMDb 优化的搜索策略
 * @param title 原始标题
 * @returns 搜索策略数组，按优先级排序
 */
export function generateTMDbSearchStrategies(title: string): string[] {
  if (!title) return [];

  const strategies: string[] = [];

  // 1. 基础变体
  const basicVariants = generateSearchVariants(title);
  strategies.push(...basicVariants);

  // 2. 英文翻译尝试（如果是中文标题）
  if (containsChinese(title)) {
    // 移除常见中文词汇，可能有助于匹配英文标题
    const withoutCommonChinese = title.replace(/第.*季|第.*集/g, '').trim();

    if (withoutCommonChinese && withoutCommonChinese !== title) {
      strategies.push(withoutCommonChinese);
    }
  }

  // 3. 数字和特殊字符处理
  const withNumberVariants = generateNumberVariants(title);
  strategies.push(...withNumberVariants);

  // 4. 去重并过滤
  return [...new Set(strategies)].filter((s) => s.length >= 2).slice(0, 8); // 限制最多8个策略，避免过多请求
}

/**
 * 检查字符串是否包含中文字符
 */
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * 生成数字相关的搜索变体
 */
function generateNumberVariants(title: string): string[] {
  const variants: string[] = [];

  // 阿拉伯数字转中文数字
  const chineseNumbers: { [key: string]: string } = {
    '1': '一',
    '2': '二',
    '3': '三',
    '4': '四',
    '5': '五',
    '6': '六',
    '7': '七',
    '8': '八',
    '9': '九',
    '10': '十',
  };

  // 中文数字转阿拉伯数字
  const arabicNumbers: { [key: string]: string } = {
    一: '1',
    二: '2',
    三: '3',
    四: '4',
    五: '5',
    六: '6',
    七: '7',
    八: '8',
    九: '9',
    十: '10',
  };

  // 转换数字
  let withChineseNumbers = title;
  let withArabicNumbers = title;

  Object.entries(chineseNumbers).forEach(([arabic, chinese]) => {
    withChineseNumbers = withChineseNumbers.replace(
      new RegExp(arabic, 'g'),
      chinese
    );
  });

  Object.entries(arabicNumbers).forEach(([chinese, arabic]) => {
    withArabicNumbers = withArabicNumbers.replace(
      new RegExp(chinese, 'g'),
      arabic
    );
  });

  if (withChineseNumbers !== title) variants.push(withChineseNumbers);
  if (withArabicNumbers !== title) variants.push(withArabicNumbers);

  return variants;
}

/**
 * 评估搜索结果的相关性
 * @param query 搜索查询
 * @param result TMDb 搜索结果
 * @returns 相关性分数 (0-1)
 */
export function calculateRelevanceScore(query: string, result: TMDbMovie): number {
  if (!result || !query) return 0;

  const title = result.title || result.name || '';
  const originalTitle = result.original_title || result.original_name || '';

  let maxScore = 0;

  // 与标题的相似度
  maxScore = Math.max(maxScore, calculateStringSimilarity(query, title));
  maxScore = Math.max(
    maxScore,
    calculateStringSimilarity(query, originalTitle)
  );

  // 与清洗后标题的相似度
  const cleanQuery = query.replace(/[\s\-_]/g, '').toLowerCase();
  const cleanTitle = title.replace(/[\s\-_]/g, '').toLowerCase();
  const cleanOriginal = originalTitle.replace(/[\s\-_]/g, '').toLowerCase();

  maxScore = Math.max(
    maxScore,
    calculateStringSimilarity(cleanQuery, cleanTitle)
  );
  maxScore = Math.max(
    maxScore,
    calculateStringSimilarity(cleanQuery, cleanOriginal)
  );

  // 包含关系加分
  if (
    title.toLowerCase().includes(query.toLowerCase()) ||
    query.toLowerCase().includes(title.toLowerCase())
  ) {
    maxScore = Math.max(maxScore, 0.8);
  }

  return maxScore;
}

/**
 * 简单的字符串相似度计算
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * 计算编辑距离
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * 常见的中文影视作品关键词映射
 * 用于提高搜索准确性
 */
export const CHINESE_TITLE_MAPPINGS: { [key: string]: string[] } = {
  // 常见词汇
  传说: ['Legend'],
  英雄: ['Hero'],
  王者: ['King'],
  战士: ['Warrior'],
  冒险: ['Adventure'],
  奇迹: ['Miracle'],
  梦想: ['Dream'],
  未来: ['Future'],
  时空: ['Time', 'Space'],
  宇宙: ['Universe', 'Cosmos'],
  星际: ['Interstellar', 'Star'],
  银河: ['Galaxy'],
  龙: ['Dragon'],
  凤: ['Phoenix'],
  仙: ['Immortal', 'Fairy'],
  神: ['God', 'Divine'],
  魔: ['Demon', 'Magic'],
  武: ['Martial', 'Fighting'],
  剑: ['Sword'],
  刀: ['Blade'],
  拳: ['Fist'],
  功夫: ['Kung Fu'],
  江湖: ['Jianghu'],
  侠: ['Hero', 'Knight'],
  皇: ['Emperor', 'Imperial'],
  王: ['King', 'Royal'],
  公主: ['Princess'],
  王子: ['Prince'],
  学院: ['Academy', 'School'],
  高校: ['High School'],
  大学: ['University', 'College'],
  青春: ['Youth'],
  恋爱: ['Love', 'Romance'],
  友情: ['Friendship'],
  家族: ['Family'],
  兄弟: ['Brother'],
  姐妹: ['Sister'],
  父亲: ['Father'],
  母亲: ['Mother'],
  儿子: ['Son'],
  女儿: ['Daughter'],
};

/**
 * 尝试使用关键词映射生成英文搜索词
 */
export function generateEnglishKeywords(chineseTitle: string): string[] {
  const keywords: string[] = [];

  Object.entries(CHINESE_TITLE_MAPPINGS).forEach(([chinese, englishList]) => {
    if (chineseTitle.includes(chinese)) {
      keywords.push(...englishList);
    }
  });

  return keywords;
}
