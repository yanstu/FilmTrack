/**
 * 标题处理工具
 * 用于清洗和规范化标题，解决豆瓣和TMDb标题不匹配的问题
 */

/**
 * 清洗标题，移除季数信息和其他无关信息
 * @param title 原始标题
 * @returns 清洗后的标题
 */
export function cleanTitle(title: string): string {
  if (!title) return '';

  // 先处理斜杠分隔的标题，只保留第一部分
  let cleaned = title.split(/\s*[\/\|]\s*/)[0].trim();

  // 移除季数信息（各种格式）
  cleaned = cleaned
    .replace(/\s*第[一二三四五六七八九十\d]+季\s*/g, ' ')
    .replace(/\s*Season\s*\d+\s*/gi, ' ')
    .replace(/\s*S\d+\s*/gi, ' ')
    .replace(/\s*年番\d*\s*/g, ' ');

  // 移除集数信息
  cleaned = cleaned
    .replace(/\s*第\d+-?\d*集\s*/g, ' ')
    .replace(/\s*\d+-?\d*集\s*/g, ' ')
    .replace(/\s*EP?\d+-?\d*\s*/gi, ' ');

  // 移除年份信息（如"(2021)"）
  cleaned = cleaned.replace(/\s*\(\d{4}\)\s*/g, ' ');

  // 移除其他常见无关信息
  cleaned = cleaned
    .replace(/\s*完结篇\s*/g, ' ')
    .replace(/\s*特别篇\s*/g, ' ')
    .replace(/\s*剧场版\s*/g, ' ')
    .replace(/\s*电影版\s*/g, ' ')
    .replace(/\s*OVA\s*/g, ' ')
    .replace(/\s*TV动画\s*/g, ' ')
    .replace(/\s*(TV版|网络版|导演剪辑版|完整版|未删减版)\s*/g, ' ')
    .replace(/\s*(HD|4K|蓝光|DVD)\s*/gi, ' ');

  // 移除多余空格并修剪
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * 获取标题的核心部分（通常是冒号前的部分）
 * @param title 原始标题
 * @returns 标题的核心部分
 */
export function getCoreTitlePart(title: string): string {
  if (!title) return '';
  
  // 先清洗标题
  const cleaned = cleanTitle(title);
  
  // 提取冒号或破折号前的部分
  const match = cleaned.match(/^(.+?)[\s:：\-]/);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return cleaned;
}

/**
 * 生成用于搜索的标题关键词
 * @param title 原始标题
 * @returns 搜索关键词
 */
export function generateSearchKeywords(title: string): string {
  if (!title) return '';
  
  // 获取核心标题
  const coreTitle = getCoreTitlePart(title);
  
  // 如果核心标题太短，则使用清洗后的完整标题
  if (coreTitle.length < 2) {
    return cleanTitle(title);
  }
  
  return coreTitle;
}

/**
 * 计算两个标题的相似度（0-1之间，1表示完全匹配）
 * 使用简单的字符匹配算法
 * @param title1 标题1
 * @param title2 标题2
 * @returns 相似度分数
 */
export function calculateTitleSimilarity(title1: string, title2: string): number {
  if (!title1 || !title2) return 0;
  
  // 清洗两个标题
  const cleaned1 = cleanTitle(title1).toLowerCase();
  const cleaned2 = cleanTitle(title2).toLowerCase();
  
  // 如果完全相同
  if (cleaned1 === cleaned2) return 1;
  
  // 如果一个包含另一个
  if (cleaned1.includes(cleaned2) || cleaned2.includes(cleaned1)) {
    const longerLength = Math.max(cleaned1.length, cleaned2.length);
    const shorterLength = Math.min(cleaned1.length, cleaned2.length);
    return shorterLength / longerLength;
  }
  
  // 计算编辑距离
  const distance = levenshteinDistance(cleaned1, cleaned2);
  const maxLength = Math.max(cleaned1.length, cleaned2.length);
  
  return 1 - distance / maxLength;
}

/**
 * 计算Levenshtein距离（编辑距离）
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 编辑距离
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // 创建距离矩阵
  const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
  
  // 初始化
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  // 填充矩阵
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // 替换
          dp[i][j - 1] + 1,     // 插入
          dp[i - 1][j] + 1      // 删除
        );
      }
    }
  }
  
  return dp[m][n];
} 