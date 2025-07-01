/**
 * 豆瓣导入功能的Hook
 */

import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../../stores/app';
import { useMovieStore } from '../../../stores/movie';
import { databaseAPI } from '../../../services/database-api';
import { tmdbAPI } from '../../../utils/api';
import {
  generateSearchKeywords,
  cleanTitle,
  calculateTitleSimilarity,
} from '../../../utils/titleUtils';
import { APP_CONFIG } from '../../../../config/app.config';
import type {
  ImportProgress,
  ImportLog,
  DoubanMovie,
} from '../../../types/import';

// 导入设置接口
interface ImportSettings {
  enableTitleCleaning: boolean;
  enableTMDbMatching: boolean;
}

/**
 * 从标题中提取季数信息
 * @param title 标题
 * @returns 季数，如果没有则返回null
 */
function extractSeasonNumber(title: string): number | null {
  if (!title) return null;

  // 匹配中文季数表示 - 第X季
  const chineseSeasonMatch = title.match(/第([一二三四五六七八九十\d]+)季/);
  if (chineseSeasonMatch) {
    const seasonText = chineseSeasonMatch[1];
    // 将中文数字转换为阿拉伯数字
    const chineseNumbers: Record<string, number> = {
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      七: 7,
      八: 8,
      九: 9,
      十: 10,
    };

    if (chineseNumbers[seasonText]) {
      return chineseNumbers[seasonText];
    } else {
      return parseInt(seasonText, 10);
    }
  }

  // 匹配英文季数表示 - Season X 或 SX
  const englishSeasonMatch =
    title.match(/Season\s*(\d+)/i) || title.match(/S(\d+)/i);
  if (englishSeasonMatch) {
    return parseInt(englishSeasonMatch[1], 10);
  }

  return null;
}

/**
 * 从标题中提取基础剧名（不含季数）
 * @param title 标题
 * @returns 基础剧名
 */
function extractBaseTVShowTitle(title: string): string {
  return cleanTitle(title);
}

/**
 * 检查电影或电视剧是否已存在
 * @param title 标题
 * @param type 类型
 * @param tmdbId TMDb ID
 * @returns 是否存在，以及相关数据
 */
const checkExistingMedia = async (
  title: string,
  type: string,
  tmdbId?: number
): Promise<{ exists: boolean; data?: any }> => {
  try {
    // 获取所有影视作品
    const result = await databaseAPI.getMovies();
    if (!result.success) {
      return { exists: false };
    }

    const movies = result.data;

    // 首先通过TMDb ID匹配（如果有）
    if (tmdbId) {
      const existingByTmdbId = movies.find((movie) => movie.tmdb_id === tmdbId);

      if (existingByTmdbId) {
        return { exists: true, data: existingByTmdbId };
      }
    }

    // 通过标题和类型匹配
    const cleanedTitle = cleanTitle(title).toLowerCase();
    const existingByTitle = movies.find(
      (movie) =>
        movie.type === type &&
        (cleanTitle(movie.title).toLowerCase() === cleanedTitle ||
          calculateTitleSimilarity(movie.title, title) > 0.8)
    );

    if (existingByTitle) {
      return { exists: true, data: existingByTitle };
    }

    return { exists: false };
  } catch (error) {
    console.error('检查影视作品是否存在失败:', error);
    return { exists: false };
  }
};

/**
 * 豆瓣导入Hook
 */
export function useDoubanImport() {
  // 豆瓣用户ID
  const doubanUserId = ref('');

  // 导入状态
  const isImporting = ref(false);

  // 导入设置
  const importSettings = ref<ImportSettings>({
    enableTitleCleaning: true,
    enableTMDbMatching: true,
  });

  // 导入进度
  const importProgress = ref<ImportProgress>({
    total: 0,
    current: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    processed: 0,
    matched: 0,
  });

  // 导入日志
  const importLogs = ref<ImportLog[]>([]);

  // 是否应该停止导入
  const shouldStop = ref(false);

  // 导入会话ID
  const importSessionId = ref<string>('');

  // 添加日志
  const addLog = async (type: ImportLog['type'], message: string) => {
    importLogs.value.push({
      type,
      message,
      timestamp: Date.now(),
    });

    // 写入日志文件
    try {
      const logMessage = `[${type.toUpperCase()}] ${message}`;
      await invoke('write_douban_import_log', {
        logMessage,
        sessionId: importSessionId.value || undefined,
      });
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  };

  // 重置导入状态
  const resetImport = () => {
    importProgress.value = {
      total: 0,
      current: 0,
      success: 0,
      skipped: 0,
      failed: 0,
      processed: 0,
      matched: 0,
    };
    importLogs.value = [];
    shouldStop.value = false;
    // 生成新的会话ID
    importSessionId.value = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
  };

  // 开始导入
  const startDoubanImport = async () => {
    if (isImporting.value) return;

    resetImport();
    isImporting.value = true;

    try {
      // 估算电影数量
      await addLog(
        'info',
        `正在获取豆瓣用户 ${doubanUserId.value} 的电影数量...`
      );
      const movieCount = await invoke<number>('estimate_douban_movie_count', {
        userId: doubanUserId.value,
      });

      if (movieCount === 0) {
        await addLog('error', '未找到电影数据，请检查豆瓣用户ID是否正确');
        isImporting.value = false;
        return;
      }

      importProgress.value.total = movieCount;
      await addLog('info', `找到 ${movieCount} 部电影/电视剧，开始导入...`);

      let start = 0;

      while (start < movieCount && !shouldStop.value) {
        // 获取一批电影
        const movies = await invoke<DoubanMovie[]>('fetch_douban_movies', {
          userId: doubanUserId.value,
          start,
        });

        if (movies.length === 0) break;

        // 处理每部电影
        for (const movie of movies) {
          if (shouldStop.value) break;

          importProgress.value.current++;
          importProgress.value.processed++;

          try {
            // 提取季数信息（如果是电视剧）
            const seasonNumber = extractSeasonNumber(movie.title);

            // 获取基础剧名（不含季数）
            const baseTitle = extractBaseTVShowTitle(movie.title);

            // 清理标题（如果启用）
            let searchTitle = baseTitle;

            // 首先检查影视作品是否已存在（无论电影还是电视剧）
            const existingMedia = await checkExistingMedia(
              movie.title,
              movie.type_ === 'movie' ? 'movie' : 'tv'
            );

            // 如果是电影且已存在，直接跳过
            if (movie.type_ === 'movie' && existingMedia.exists) {
              await addLog(
                'skip',
                `跳过电影 "${movie.title}" - 已存在于数据库`
              );
              importProgress.value.skipped++;
              continue;
            }

            // 如果是电视剧且已存在
            if (
              movie.type_ === 'tv' &&
              existingMedia.exists &&
              existingMedia.data
            ) {
              const existingTVShow = existingMedia.data;

              // 如果有季数信息，只更新季数（不更新评分和其他信息）
              if (
                seasonNumber &&
                seasonNumber > (existingTVShow.current_season || 0)
              ) {
                addLog(
                  'info',
                  `更新电视剧"${existingTVShow.title}"的季数: ${
                    existingTVShow.current_season || 0
                  } -> ${seasonNumber}`
                );

                // 更新季数，但保留其他信息
                await databaseAPI.updateMovie({
                  ...existingTVShow,
                  current_season: seasonNumber,
                  date_updated: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });

                importProgress.value.success++;
                addLog(
                  'success',
                  `成功更新: "${existingTVShow.title}" 的季数为 ${seasonNumber}`
                );
              } else {
                addLog(
                  'skip',
                  `跳过电视剧 "${movie.title}" - 已存在于数据库${
                    seasonNumber
                      ? `，且现有季数(${
                          existingTVShow.current_season || 0
                        })已大于或等于导入季数(${seasonNumber})`
                      : ''
                  }`
                );
                importProgress.value.skipped++;
              }

              continue; // 跳过后续处理
            }

            // 如果是新电影/电视剧，尝试匹配TMDb数据
            let tmdbData = null;
            let tmdbMatched = false;

            // 根据类型搜索
            const searchMethod =
              movie.type_ === 'movie'
                ? tmdbAPI.searchMovies.bind(tmdbAPI)
                : tmdbAPI.searchTVShows.bind(tmdbAPI);

            try {
              await addLog(
                'info',
                `TMDb搜索: "${movie.title}" -> 搜索标题: "${searchTitle}"`
              );

              const searchResult = await searchMethod(searchTitle);

              if (
                searchResult.success &&
                searchResult.data &&
                searchResult.data.results &&
                searchResult.data.results.length > 0
              ) {
                // 获取详细信息
                const detailMethod =
                  movie.type_ === 'movie'
                    ? tmdbAPI.getMovieDetails.bind(tmdbAPI)
                    : tmdbAPI.getTVDetails.bind(tmdbAPI);

                const detailResult = await detailMethod(
                  searchResult.data.results[0].id
                );

                if (detailResult.success && detailResult.data) {
                  tmdbData = detailResult.data;

                  // 再次检查是否存在相同的TMDb ID
                  const existingByTmdbId = await checkExistingMedia(
                    movie.title,
                    movie.type_ === 'movie' ? 'movie' : 'tv',
                    tmdbData.id
                  );
                  if (existingByTmdbId.exists && existingByTmdbId.data) {
                    // 如果是电影，直接跳过
                    if (movie.type_ === 'movie') {
                      addLog(
                        'skip',
                        `跳过电影 "${movie.title}" - 已存在相同TMDb ID的电影: "${existingByTmdbId.data.title}"`
                      );
                      importProgress.value.skipped++;
                      continue;
                    }

                    // 如果是电视剧，只更新季数
                    if (movie.type_ === 'tv') {
                      const existingTVShow = existingByTmdbId.data;

                      // 如果有季数信息，只更新季数（不更新评分和其他信息）
                      if (
                        seasonNumber &&
                        seasonNumber > (existingTVShow.current_season || 0)
                      ) {
                        addLog(
                          'info',
                          `更新电视剧"${existingTVShow.title}"的季数: ${
                            existingTVShow.current_season || 0
                          } -> ${seasonNumber}`
                        );

                        // 更新季数，但保留其他信息（包括日期）
                        await databaseAPI.updateMovie({
                          ...existingTVShow,
                          current_season: seasonNumber,
                          // 不更新 date_updated 和 updated_at，保持原有日期
                        });

                        importProgress.value.success++;
                        addLog(
                          'success',
                          `成功更新: "${existingTVShow.title}" 的季数为 ${seasonNumber}`
                        );
                      } else {
                        addLog(
                          'skip',
                          `跳过电视剧 "${movie.title}" - 已存在相同TMDb ID的电视剧: "${existingTVShow.title}"`
                        );
                        importProgress.value.skipped++;
                      }

                      continue; // 跳过后续处理
                    }
                  }

                  tmdbMatched = true;
                  importProgress.value.matched++;
                  addLog(
                    'success',
                    `成功匹配TMDb数据: "${movie.title}" -> "${
                      tmdbData.title || tmdbData.name
                    }"`
                  );
                }
              }
            } catch (error) {
              console.error('TMDb搜索失败:', error);
              await addLog(
                'warning',
                `TMDb搜索失败: "${movie.title}" (搜索标题: "${searchTitle}") - ${error}`
              );
            }

            // 准备要保存的数据
            let movieData: any = {};

            if (tmdbMatched && tmdbData) {
              // 使用TMDb数据，但保留指定字段
              const preservedData: Record<string, any> = {};

              // 处理评分
              if (movie.rating) {
                preservedData.personal_rating = movie.rating || 0;
              }

              // 处理观看日期
              if (movie.watched_date) {
                preservedData.watched_date = movie.watched_date;
              }

              // 处理评语
              if (movie.comment) {
                preservedData.notes = movie.comment;
              }

              // 处理季数
              if (seasonNumber && movie.type_ === 'tv') {
                preservedData.current_season = seasonNumber;
              }

              // 从TMDb转换数据
              movieData = {
                title: tmdbData.title || tmdbData.name,
                original_title:
                  tmdbData.original_title ||
                  tmdbData.original_name ||
                  tmdbData.title ||
                  tmdbData.name,
                overview: tmdbData.overview,
                poster_path: tmdbData.poster_path,
                backdrop_path: tmdbData.backdrop_path,
                tmdb_id: tmdbData.id,
                tmdb_rating: tmdbData.vote_average,
                year:
                  new Date(
                    tmdbData.release_date || tmdbData.first_air_date || ''
                  ).getFullYear() || null,
                runtime:
                  tmdbData.runtime ||
                  (tmdbData.episode_run_time
                    ? tmdbData.episode_run_time[0]
                    : null),
                genres: tmdbData.genres
                  ? tmdbData.genres.map((g: any) => g.name).join(',')
                  : '',
                type: movie.type_ === 'movie' ? 'movie' : 'tv',
                status: 'completed', // 默认为已看
                personal_rating: movie.rating || 0,
                user_rating: movie.rating || 0,
                // 使用豆瓣的观看日期作为创建日期和更新日期
                date_added: movie.watched_date || new Date().toISOString(),
                date_updated: movie.watched_date || new Date().toISOString(),
                created_at: movie.watched_date || new Date().toISOString(),
                updated_at: movie.watched_date || new Date().toISOString(),
                watched_date: movie.watched_date,
                notes: movie.comment || '',
              };

              // 处理剧集特定字段
              if (movie.type_ === 'tv' && tmdbData.number_of_seasons) {
                movieData.total_seasons = tmdbData.number_of_seasons;
                movieData.total_episodes = tmdbData.number_of_episodes;
                movieData.air_status = tmdbData.status;

                // 如果没有从豆瓣标题中提取到季数，但是是单季剧集，设置为第1季
                if (
                  !movieData.current_season &&
                  tmdbData.number_of_seasons === 1
                ) {
                  movieData.current_season = 1;
                }

                // 已完成的剧集，设置当前集数为最后一集
                if (
                  movieData.status === 'completed' &&
                  tmdbData.number_of_episodes
                ) {
                  movieData.current_episode = tmdbData.number_of_episodes;
                }

                // 如果没有设置当前集数但状态是已完成，设置为最后一集
                if (
                  movieData.status === 'completed' &&
                  !movieData.current_episode &&
                  tmdbData.number_of_episodes
                ) {
                  movieData.current_episode = tmdbData.number_of_episodes;
                }
              }
            } else {
              // 未找到TMDb匹配，加入失败列表
              importProgress.value.failed++;
              await addLog(
                'error',
                `未找到TMDb匹配: "${movie.title}" (搜索标题: "${searchTitle}"), 跳过导入`
              );
              continue; // 跳过这个电影，不进行数据库插入
            }

            // 添加到数据库
            const result = await databaseAPI.addMovie(movieData);

            if (result.success) {
              importProgress.value.success++;
              await addLog('success', `成功导入: "${movieData.title}"`);
            } else {
              importProgress.value.failed++;
              await addLog(
                'error',
                `导入失败: "${movieData.title}" - ${result.error}`
              );
            }
          } catch (error) {
            importProgress.value.failed++;
            addLog('error', `处理失败: "${movie.title}" - ${error}`);
          }
        }

        // 更新开始索引
        start += movies.length;
      }

      if (shouldStop.value) {
        addLog('warning', '导入已手动停止');
      } else {
        addLog(
          'success',
          `导入完成! 成功: ${importProgress.value.success}, 跳过: ${importProgress.value.skipped}, 失败: ${importProgress.value.failed}`
        );
      }
    } catch (error) {
      addLog('error', `导入过程出错: ${error}`);
    } finally {
      isImporting.value = false;
    }
  };

  // 停止导入
  const stopImport = () => {
    shouldStop.value = true;
    addLog('warning', '正在停止导入...');
  };

  // 更新导入设置
  const updateImportSettings = (settings: Partial<ImportSettings>) => {
    importSettings.value = { ...importSettings.value, ...settings };
  };

  return {
    doubanUserId,
    isImporting,
    importProgress,
    importLogs,
    importSettings,
    startDoubanImport,
    stopImport,
    updateImportSettings,
  };
}
