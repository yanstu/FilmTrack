import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { MovieDAO } from '../src/services/database/dao/movie.dao.ts'
import { DatabaseConnection } from '../src/services/database/connection.ts'
import { DatabaseApiService } from '../src/services/database-api.ts'
import { DatabaseSchema } from '../src/services/database/schema.ts'
import {
  buildSeasonsDataFromTmdb,
  getLastAvailableProgress,
  getNextWatchProgress,
  getWatchProgressSummary,
  normalizeProgressForStatus
} from '../src/utils/seasonProgress.ts'

const originalGetInstance = DatabaseConnection.getInstance
const originalExistsMovie = MovieDAO.existsMovie
const schemaInternals = DatabaseSchema
const originalEnsureDatabaseBackup = schemaInternals.ensureDatabaseBackup
const originalSchemaFs = schemaInternals.fs

const dbMock = {
  execute: async () => {},
  select: async () => []
}

beforeEach(() => {
  dbMock.execute = async () => {}
  dbMock.select = async () => []
  DatabaseConnection.getInstance = async () => dbMock
  MovieDAO.existsMovie = originalExistsMovie
  schemaInternals.ensureDatabaseBackup = originalEnsureDatabaseBackup
  schemaInternals.fs = originalSchemaFs
  schemaInternals.initialized = false
})

afterEach(() => {
  DatabaseConnection.getInstance = originalGetInstance
  MovieDAO.existsMovie = originalExistsMovie
  schemaInternals.ensureDatabaseBackup = originalEnsureDatabaseBackup
  schemaInternals.fs = originalSchemaFs
  schemaInternals.initialized = false
})

describe('MovieDAO.existsMovie', () => {
  it('优先按 tmdb_id 并回退标题查询是否存在', async () => {
    let capturedSql = ''
    let capturedParams = []
    dbMock.select = async (sql, params) => {
      capturedSql = sql
      capturedParams = params
      return [{ matched: 1 }]
    }

    const result = await MovieDAO.existsMovie(' Inception ', '123')

    assert.deepEqual(result, {
      success: true,
      data: { exists: true }
    })
    assert.equal(
      capturedSql,
      'SELECT 1 as matched FROM movies WHERE tmdb_id = $1 OR title = $2 LIMIT 1'
    )
    assert.deepEqual(capturedParams, [123, 'Inception'])
  })

  it('在没有可用条件时直接返回不存在', async () => {
    let called = false
    dbMock.select = async () => {
      called = true
      return []
    }

    const result = await MovieDAO.existsMovie('   ', '')

    assert.deepEqual(result, {
      success: true,
      data: { exists: false }
    })
    assert.equal(called, false)
  })
})

describe('DatabaseApiService.checkExistingMovie', () => {
  it('透传 DAO 的存在性查询结果', async () => {
    MovieDAO.existsMovie = async (title, externalId) => {
      assert.equal(title, 'Interstellar')
      assert.equal(externalId, '42')
      return {
        success: true,
        data: { exists: true }
      }
    }

    const result = await DatabaseApiService.checkExistingMovie('Interstellar', '42')

    assert.deepEqual(result, {
      success: true,
      data: { exists: true }
    })
  })

  it('在 DAO 失败时返回单层错误信息', async () => {
    MovieDAO.existsMovie = async () => ({
      success: false,
      error: '数据库不可用'
    })

    const result = await DatabaseApiService.checkExistingMovie('Interstellar', '42')

    assert.equal(result.success, false)
    assert.equal(result.error, '数据库不可用')
  })
})

describe('DatabaseSchema.ensureTableStructure', () => {
  it('在存在待执行迁移时执行备份和迁移记录写入', async () => {
    let backupCount = 0
    const executeCalls = []

    schemaInternals.ensureDatabaseBackup = async () => {
      backupCount += 1
    }
    dbMock.execute = async (sql, params) => {
      executeCalls.push([String(sql), params])
    }
    dbMock.select = async (sql) => {
      if (String(sql).includes('SELECT version FROM schema_migrations')) {
        return []
      }
      return []
    }

    await DatabaseSchema.ensureTableStructure()

    assert.equal(backupCount, 1)
    assert.equal(
      executeCalls.filter(([sql]) => sql === 'BEGIN TRANSACTION').length,
      2
    )
    assert.equal(
      executeCalls.filter(([sql]) => sql === 'COMMIT').length,
      2
    )
    assert.equal(
      executeCalls.filter(([sql]) => sql.includes('INSERT INTO schema_migrations')).length,
      2
    )
  })

  it('在没有待执行迁移时跳过备份', async () => {
    let backupCount = 0

    schemaInternals.ensureDatabaseBackup = async () => {
      backupCount += 1
    }
    dbMock.select = async (sql) => {
      if (String(sql).includes('SELECT version FROM schema_migrations')) {
        return [{ version: 1 }, { version: 2 }]
      }
      return []
    }

    await DatabaseSchema.ensureTableStructure()

    assert.equal(backupCount, 0)
  })

  it('在自动备份失败时仅告警，不阻塞迁移执行', async () => {
    const executeCalls = []
    const warningCalls = []
    const originalWarn = console.warn

    schemaInternals.fs = {
      exists: async () => {
        throw new Error('forbidden path')
      },
      mkdir: async () => {},
      copyFile: async () => {}
    }

    dbMock.execute = async (sql, params) => {
      executeCalls.push([String(sql), params])
    }
    dbMock.select = async (sql) => {
      if (String(sql).includes('SELECT version FROM schema_migrations')) {
        return []
      }
      return []
    }
    console.warn = (...args) => {
      warningCalls.push(args)
    }

    try {
      await DatabaseSchema.ensureTableStructure()
    } finally {
      console.warn = originalWarn
    }

    assert.equal(warningCalls.length, 1)
    assert.equal(
      executeCalls.filter(([sql]) => sql === 'BEGIN TRANSACTION').length,
      2
    )
    assert.equal(
      executeCalls.filter(([sql]) => sql === 'COMMIT').length,
      2
    )
  })
})

describe('seasonProgress', () => {
  it('在多季剧中正确计算累计观看进度', () => {
    const seasonsData = buildSeasonsDataFromTmdb([
      { season_number: 0, episode_count: 1 },
      { season_number: 1, episode_count: 10 },
      { season_number: 2, episode_count: 8 }
    ])

    const summary = getWatchProgressSummary({
      type: 'tv',
      current_season: 2,
      current_episode: 3,
      total_episodes: 18,
      seasons_data: seasonsData
    })

    assert.deepEqual(summary, {
      current: 13,
      total: 18,
      percentage: 72,
      isCompleted: false
    })
  })

  it('completed 状态会对齐到最后可用季和集', () => {
    const seasonsData = buildSeasonsDataFromTmdb([
      { season_number: 1, episode_count: 12 },
      { season_number: 2, episode_count: 8 }
    ])

    const result = normalizeProgressForStatus({
      type: 'tv',
      status: 'completed',
      current_season: 1,
      current_episode: 4,
      seasons_data: seasonsData,
      total_episodes: 20,
      total_seasons: 2
    })

    assert.equal(result.current_season, 2)
    assert.equal(result.current_episode, 8)
  })

  it('在总集数未知时 completed 保留已有进度，不回退到 0', () => {
    const result = normalizeProgressForStatus({
      type: 'tv',
      status: 'completed',
      current_season: 3,
      current_episode: 6
    })

    assert.equal(result.current_season, 3)
    assert.equal(result.current_episode, 6)
  })

  it('mark next episode 会在季末切到下一季第一集', () => {
    const nextProgress = getNextWatchProgress({
      type: 'tv',
      current_season: 1,
      current_episode: 10,
      total_seasons: 2,
      seasons_data: {
        '1': { season_number: 1, name: '第 1 季', episode_count: 10 },
        '2': { season_number: 2, name: '第 2 季', episode_count: 8 }
      }
    })

    assert.deepEqual(nextProgress, {
      season: 2,
      episode: 1
    })
  })

  it('最后可用进度在缺少季数据时回退到当前或总集数', () => {
    const withTotal = getLastAvailableProgress({
      type: 'tv',
      current_season: 2,
      current_episode: 4,
      total_seasons: 3,
      total_episodes: 24
    })
    const withoutTotal = getLastAvailableProgress({
      type: 'tv',
      current_season: 2,
      current_episode: 4
    })

    assert.deepEqual(withTotal, {
      season: 3,
      episode: 24
    })
    assert.deepEqual(withoutTotal, {
      season: 2,
      episode: 4
    })
  })
})
