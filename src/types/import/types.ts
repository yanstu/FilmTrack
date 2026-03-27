/**
 * 导入功能相关的类型定义
 */

import type { Movie, ReplayRecord } from '../../types';

// 导入日志类型
export type ImportLogType = 'success' | 'skip' | 'error' | 'warning' | 'info';

export type ImportReviewStatus = 'pending' | 'resolved';
export type ImportReviewCategory = 'skipped' | 'failed' | 'merged' | 'matched';

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
}

export interface ImportReviewItem {
  id: string;
  title: string;
  originalTitle?: string;
  type: 'movie' | 'tv';
  category: ImportReviewCategory;
  status: ImportReviewStatus;
  reason: string;
  actionLabel: string;
  query: string;
  tmdbId?: number;
  seasonNumber?: number | null;
  doubanId?: string;
  matchedTitle?: string;
  score?: number;
  timestamp: number;
}

export interface BackupPackageMetadata {
  app: 'FilmTrack';
  version: string;
  exported_at: string;
  record_count: number;
  replay_record_count: number;
}

export interface BackupPackage {
  metadata: BackupPackageMetadata;
  movies: Movie[];
  replay_records: ReplayRecord[];
}

// 导出格式
export type ExportFormat = 'csv' | 'json'; 
