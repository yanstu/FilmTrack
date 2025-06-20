/**
 * 文件导入导出操作的Hook
 */

import { ref } from 'vue';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { useAppStore } from '../../../stores/app';
import { useMovieStore } from '../../../stores/movie';
import { databaseAPI } from '../../../services/database-api';
import type { ExportFormat } from '../../../types/import';

export function useFileOperations() {
  // 状态
  const isExporting = ref(false);
  const isImporting = ref(false);
  const movieStore = useMovieStore();

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
        await exportToJSON(movies, filePath);
      }
      
      alert('导出成功！');
    } catch (error) {
      console.error('导出数据失败:', error);
      alert(`导出失败: ${error}`);
    } finally {
      isExporting.value = false;
    }
  };

  // 导出为CSV
  const exportToCSV = async (movies: any[], filePath: string) => {
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
  const exportToJSON = async (movies: any[], filePath: string) => {
    const jsonContent = JSON.stringify(movies, null, 2);
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
      let data = [];
      
      // 解析数据
      if (format === 'csv') {
        data = parseCSV(content);
      } else {
        data = JSON.parse(content);
      }
      
      // 导入数据
      let successCount = 0;
      let skipCount = 0;
      let failCount = 0;
      
      for (const item of data) {
        try {
          // 检查是否已存在
          const existsResponse = await databaseAPI.checkExistingMovie(item.title, item.tmdb_id);
          if (existsResponse.success && existsResponse.data && existsResponse.data.exists) {
            skipCount++;
            continue;
          }
          
          // 添加到数据库
          await databaseAPI.addMovie(item);
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`导入失败: ${item.title} - ${error}`);
        }
      }
      
      alert(`导入完成！成功: ${successCount}, 跳过: ${skipCount}, 失败: ${failCount}`);
      
    } catch (error) {
      console.error('导入数据失败:', error);
      alert(`导入失败: ${error}`);
    } finally {
      isImporting.value = false;
    }
  };

  // 解析CSV文件
  const parseCSV = (csvContent: string): any[] => {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).filter(line => line.trim()).map(line => {
      const values = parseCSVRow(line);
      const item: any = {};
      
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