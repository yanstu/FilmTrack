/**
 * 文件导入导出操作的Hook
 */

import { ref } from 'vue';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { getVersion } from '@tauri-apps/api/app';
import { useAppStore } from '../../../stores/app';
import { useMovieStore } from '../../../stores/movie';
import { databaseAPI } from '../../../services/database-api';
import type { BackupPackage, ExportFormat } from '../../../types/import';
import type { Movie, CSVParseResult, ReplayRecord } from '../../../types';

type ImportSummary = {
  successCount: number;
  skipCount: number;
  failCount: number;
};

function buildMovieIdentityKey(movie: Pick<Movie, 'tmdb_id' | 'title' | 'type'>): string {
  if (movie.tmdb_id) {
    return `tmdb:${movie.tmdb_id}`;
  }

  return `title:${movie.type}:${(movie.title || '').trim().toLowerCase()}`;
}

function buildReplayRecordIdentityKey(record: Pick<ReplayRecord, 'movie_id' | 'watch_date' | 'season' | 'episode' | 'rating' | 'notes'>): string {
  return [
    record.movie_id,
    record.watch_date,
    record.season ?? '',
    record.episode ?? '',
    record.rating ?? '',
    (record.notes || '').trim()
  ].join('::');
}

function isBackupPackage(data: unknown): data is BackupPackage {
  return Boolean(
    data &&
    typeof data === 'object' &&
    Array.isArray((data as BackupPackage).movies) &&
    Array.isArray((data as BackupPackage).replay_records)
  );
}

export function useFileOperations() {
  // 状态
  const isExporting = ref(false);
  const isImporting = ref(false);
  const movieStore = useMovieStore();
  const appStore = useAppStore();

  // 导出数据
  const exportData = async (format: ExportFormat) => {
    if (isExporting.value) return;
    
    try {
      isExporting.value = true;
      
      // 获取所有影视记录
      const response = await movieStore.fetchMovies();
      if (!response.success) {
        throw new Error('无法获取影视数据');
      }
      const movies = movieStore.movies;
      
      // 选择保存位置
      const filePath = await save({
        filters: [{
          name: format === 'csv' ? 'CSV文件' : 'JSON文件',
          extensions: [format]
        }],
        defaultPath: `filmtrack_export.${format}`
      });
      
      if (!filePath) return; // 用户取消了保存
      
      // 根据格式导出数据
      if (format === 'csv') {
        await exportToCSV(movies, filePath);
      } else {
        await exportToJSON(filePath);
      }
      
      appStore.modalService.showInfo('导出成功', `数据已导出到：${filePath}`);
    } catch (error) {
      console.error('导出数据失败:', error);
      appStore.modalService.showError('导出失败', String(error));
    } finally {
      isExporting.value = false;
    }
  };

  // 导出为CSV
  const exportToCSV = async (movies: Movie[], filePath: string) => {
    // CSV表头
    const headers = [
      'id', 'title', 'original_title', 'type', 'status',
      'personal_rating', 'tmdb_id', 'poster_path', 'overview',
      'current_episode', 'total_episodes', 'created_at', 'updated_at'
    ].join(',');
    
    // 转换数据为CSV行
    const rows = movies.map(movie => [
      movie.id,
      `"${(movie.title || '').replace(/"/g, '""')}"`,
      `"${(movie.original_title || '').replace(/"/g, '""')}"`,
      movie.type,
      movie.status,
      movie.personal_rating || '',
      movie.tmdb_id || '',
      movie.poster_path || '',
      `"${(movie.overview || '').replace(/"/g, '""')}"`,
      movie.current_episode || '',
      movie.total_episodes || '',
      movie.created_at,
      movie.updated_at
    ].join(','));
    
    // 组合CSV内容
    const csvContent = [headers, ...rows].join('\n');
    
    // 写入文件
    await writeTextFile(filePath, csvContent);
  };

  // 导出为JSON
  const exportToJSON = async (filePath: string) => {
    const [moviesResponse, replayRecordsResponse, appVersion] = await Promise.all([
      databaseAPI.getMovies(),
      databaseAPI.getReplayRecords(),
      getVersion().catch(() => 'unknown')
    ]);

    if (!moviesResponse.success || !moviesResponse.data) {
      throw new Error(moviesResponse.error || '无法读取影视记录');
    }

    if (!replayRecordsResponse.success || !replayRecordsResponse.data) {
      throw new Error(replayRecordsResponse.error || '无法读取重刷记录');
    }

    const backupPackage: BackupPackage = {
      metadata: {
        app: 'FilmTrack',
        version: appVersion,
        exported_at: new Date().toISOString(),
        record_count: moviesResponse.data.length,
        replay_record_count: replayRecordsResponse.data.length,
      },
      movies: moviesResponse.data,
      replay_records: replayRecordsResponse.data,
    };

    const jsonContent = JSON.stringify(backupPackage, null, 2);
    await writeTextFile(filePath, jsonContent);
  };

  // 从文件导入数据
  const importFromFile = async (format: ExportFormat) => {
    if (isImporting.value) return;
    
    try {
      isImporting.value = true;
      
      // 选择要导入的文件
      const selected = await open({
        multiple: false,
        filters: [{
          name: format === 'csv' ? 'CSV文件' : 'JSON文件',
          extensions: [format]
        }]
      });
      
      if (!selected) {
        isImporting.value = false;
        return; // 用户取消了选择
      }
      
      const filePath = selected as string;
      
      // 读取文件内容
      const content = await readTextFile(filePath);
      let importedMovies: Movie[] = [];
      let importedReplayRecords: ReplayRecord[] = [];
      
      // 解析数据
      if (format === 'csv') {
        importedMovies = parseCSV(content) as unknown as Movie[];
      } else {
        const parsed = JSON.parse(content);
        if (isBackupPackage(parsed)) {
          importedMovies = parsed.movies;
          importedReplayRecords = parsed.replay_records;
        } else if (Array.isArray(parsed)) {
          importedMovies = parsed;
        } else {
          throw new Error('无法识别该备份文件格式');
        }
      }
      
      const summary = await importBackupData(importedMovies, importedReplayRecords);

      if (summary.successCount > 0) {
        await movieStore.fetchMovies({ force: true });
      }
      
      appStore.modalService.showInfo(
        '导入完成',
        `成功: ${summary.successCount}，跳过: ${summary.skipCount}，失败: ${summary.failCount}`
      );
      
    } catch (error) {
      console.error('导入数据失败:', error);
      appStore.modalService.showError('导入失败', String(error));
    } finally {
      isImporting.value = false;
    }
  };

  const importBackupData = async (
    importedMovies: Movie[],
    importedReplayRecords: ReplayRecord[]
  ): Promise<ImportSummary> => {
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    const [existingMoviesResponse, existingReplayRecordsResponse] = await Promise.all([
      databaseAPI.getMovies(),
      databaseAPI.getReplayRecords()
    ]);

    if (!existingMoviesResponse.success || !existingMoviesResponse.data) {
      throw new Error(existingMoviesResponse.error || '读取现有影视库失败');
    }

    if (!existingReplayRecordsResponse.success || !existingReplayRecordsResponse.data) {
      throw new Error(existingReplayRecordsResponse.error || '读取现有重刷记录失败');
    }

    const movieIdentityMap = new Map<string, Movie>();
    const sourceToTargetMovieId = new Map<string, string>();
    existingMoviesResponse.data.forEach(movie => {
      movieIdentityMap.set(buildMovieIdentityKey(movie), movie);
    });

    for (const item of importedMovies) {
      try {
        const identityKey = buildMovieIdentityKey(item);
        const existedMovie = movieIdentityMap.get(identityKey);
        if (existedMovie) {
          sourceToTargetMovieId.set(item.id, existedMovie.id);
          skipCount++;
          continue;
        }

        const addResult = await databaseAPI.addMovie(item);
        if (!addResult.success || !addResult.data) {
          failCount++;
          continue;
        }

        successCount++;
        movieIdentityMap.set(identityKey, addResult.data);
        sourceToTargetMovieId.set(item.id, addResult.data.id);
      } catch (error) {
        failCount++;
        console.error(`导入影视记录失败: ${item.title} - ${error}`);
      }
    }

    if (importedReplayRecords.length === 0) {
      return { successCount, skipCount, failCount };
    }

    const replayRecordIdentitySet = new Set(
      existingReplayRecordsResponse.data.map(record => buildReplayRecordIdentityKey(record))
    );

    for (const record of importedReplayRecords) {
      const targetMovieId = sourceToTargetMovieId.get(record.movie_id) || record.movie_id;
      if (!targetMovieId) {
        failCount++;
        continue;
      }

      const identityKey = buildReplayRecordIdentityKey({
        ...record,
        movie_id: targetMovieId,
      });

      if (replayRecordIdentitySet.has(identityKey)) {
        skipCount++;
        continue;
      }

      try {
        const addRecordResult = await databaseAPI.addReplayRecord({
          movie_id: targetMovieId,
          watch_date: record.watch_date,
          season: record.season ?? undefined,
          episode: record.episode ?? undefined,
          duration: record.duration ?? 0,
          progress: record.progress ?? 1,
          rating: record.rating ?? undefined,
          notes: record.notes ?? undefined,
        });

        if (!addRecordResult.success) {
          failCount++;
          continue;
        }

        replayRecordIdentitySet.add(identityKey);
        successCount++;
      } catch (error) {
        failCount++;
        console.error(`导入重刷记录失败: ${record.id} - ${error}`);
      }
    }

    return { successCount, skipCount, failCount };
  };

  // 解析CSV文件
  const parseCSV = (csvContent: string): CSVParseResult[] => {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).filter(line => line.trim()).map(line => {
      const values = parseCSVRow(line);
      const item: CSVParseResult = {};
      
      headers.forEach((header, index) => {
        item[header] = values[index];
      });
      
      return item;
    });
  };

  // 解析CSV行，处理引号等特殊情况
  const parseCSVRow = (row: string): string[] => {
    const result = [];
    let insideQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        if (i + 1 < row.length && row[i + 1] === '"') {
          // 处理双引号转义
          currentValue += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    result.push(currentValue);
    return result;
  };

  return {
    isExporting,
    isImporting,
    exportData,
    importFromFile
  };
}
