/**
 * 导入功能相关的类型定义
 */

// 导入日志类型
export type ImportLogType = 'success' | 'skip' | 'error' | 'warning' | 'info';

// 导入日志条目
export interface ImportLog {
  type: ImportLogType;
  message: string;
  timestamp?: number;
}

// 导入进度状态
export interface ImportProgress {
  total: number;        // 总条目数
  current: number;      // 当前处理的条目数
  success: number;      // 成功导入的条目数
  skipped: number;      // 跳过的条目数
  failed: number;       // 失败的条目数
  processed: number;    // 处理完成的条目数
  matched: number;      // 成功匹配TMDb的条目数
}

// 豆瓣电影数据结构
export interface DoubanMovie {
  title: string;
  original_title: string;
  douban_id: string;
  douban_url: string;
  cover_url: string;
  rating: number;
  watched_date: string;
  type_: string; // movie 或 tv
  comment?: string;
  tags: string[];
}

// 导入选项
export interface ImportOptions {
  updateExisting?: boolean;
  importComments?: boolean;
  importRatings?: boolean;
  importTags?: boolean;
  preserveFields?: string[]; // 保留的字段名
}

// 导出格式
export type ExportFormat = 'csv' | 'json'; 