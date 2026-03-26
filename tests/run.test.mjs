import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import { MovieDAO } from '../src/services/database/dao/movie.dao.ts'
import { DatabaseConnection } from '../src/services/database/connection.ts'
import { DatabaseApiService } from '../src/services/database-api.ts'
import { DatabaseSchema } from '../src/services/database/schema.ts'
import { useDoubanImport } from '../src/views/Import/hooks/useDoubanImport.ts'
import {
  buildSeasonsDataFromTmdb,
  getLastAvailableProgress,
  getNextWatchProgress,
  getWatchProgressSummary,
  normalizeProgressForStatus
} from '../src/utils/seasonProgress.ts'

const originalGetInstance = DatabaseConnection.getInstance
const originalGetRawInstance = DatabaseConnection.getRawInstance
const originalConnect = DatabaseConnection.connect
const originalExistsMovie = MovieDAO.existsMovie
const schemaInternals = DatabaseSchema
const originalEnsureTableStructure = schemaInternals.ensureTableStructure
const originalEnsureDatabaseBackup = schemaInternals.ensureDatabaseBackup
const originalSchemaFs = schemaInternals.fs

const dbMock = {
  execute: async () => {},
  select: async () => []
}

beforeEach(() => {
  setActivePinia(createPinia())
  dbMock.execute = async () => {}
  dbMock.select = async () => []
  DatabaseConnection.getInstance = async () => dbMock
  DatabaseConnection.getRawInstance = async () => dbMock
  DatabaseConnection.instance = null
  DatabaseConnection.initialized = false
  DatabaseConnection.initializationPromise = null
  MovieDAO.existsMovie = originalExistsMovie
  schemaInternals.ensureTableStructure = originalEnsureTableStructure
  schemaInternals.ensureDatabaseBackup = originalEnsureDatabaseBackup
  schemaInternals.fs = originalSchemaFs
  schemaInternals.initialized = false
})

afterEach(() => {
  DatabaseConnection.getInstance = originalGetInstance
  DatabaseConnection.getRawInstance = originalGetRawInstance
  DatabaseConnection.connect = originalConnect
  DatabaseConnection.instance = null
  DatabaseConnection.initialized = false
  DatabaseConnection.initializationPromise = null
  MovieDAO.existsMovie = originalExistsMovie
  schemaInternals.ensureTableStructure = originalEnsureTableStructure
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

  it('迁移执行期间复用原始连接，避免再次触发初始化等待', async () => {
    let rawInstanceCalls = 0
    let recursiveGetInstanceCalls = 0

    schemaInternals.ensureDatabaseBackup = async () => {}
    DatabaseConnection.getRawInstance = async () => {
      rawInstanceCalls += 1
      return dbMock
    }
    DatabaseConnection.getInstance = async () => {
      recursiveGetInstanceCalls += 1
      throw new Error('迁移期间不应再次通过 getInstance 取连接')
    }

    dbMock.select = async (sql) => {
      if (String(sql).includes('SELECT version FROM schema_migrations')) {
        return []
      }
      return []
    }

    await DatabaseSchema.ensureTableStructure()

    assert.ok(rawInstanceCalls >= 1)
    assert.equal(recursiveGetInstanceCalls, 0)
  })
})

describe('DatabaseConnection.initialize', () => {
  it('并发初始化时只建立一次连接并复用同一初始化流程', async () => {
    let connectCalls = 0
    let ensureCalls = 0

    DatabaseConnection.getInstance = originalGetInstance
    DatabaseConnection.getRawInstance = originalGetRawInstance
    DatabaseConnection.connect = async () => {
      connectCalls += 1
      await new Promise(resolve => setTimeout(resolve, 10))
      return dbMock
    }
    schemaInternals.ensureTableStructure = async () => {
      ensureCalls += 1
      await new Promise(resolve => setTimeout(resolve, 10))
      schemaInternals.initialized = true
    }

    const [db1, db2, db3] = await Promise.all([
      DatabaseConnection.getInstance(),
      DatabaseConnection.getInstance(),
      DatabaseConnection.getInstance()
    ])

    assert.equal(db1, dbMock)
    assert.equal(db2, dbMock)
    assert.equal(db3, dbMock)
    assert.equal(connectCalls, 1)
    assert.equal(ensureCalls, 1)
  })

  it('关闭连接时同步重置 schema 初始化状态', async () => {
    let closeCalls = 0

    DatabaseConnection.instance = {
      close: async () => {
        closeCalls += 1
      }
    }
    DatabaseConnection.initialized = true
    DatabaseConnection.initializationPromise = null
    schemaInternals.initialized = true

    await DatabaseConnection.close()

    assert.equal(closeCalls, 1)
    assert.equal(DatabaseConnection.instance, null)
    assert.equal(DatabaseConnection.initialized, false)
    assert.equal(schemaInternals.initialized, false)
  })
})

describe('useDoubanImport', () => {
  it('在多次调用时共享同一份导入状态，支持切页返回继续查看', () => {
    const first = useDoubanImport()
    const second = useDoubanImport()

    first.clearImportSession()
    first.doubanUserId.value = '203503302'
    first.importProgress.value.total = 120
    first.importProgress.value.current = 48
    first.importLogs.value = [{ type: 'info', message: '正在导入第 48 条' }]

    assert.equal(second.doubanUserId.value, '203503302')
    assert.equal(second.importProgress.value.total, 120)
    assert.equal(second.importProgress.value.current, 48)
    assert.equal(second.importLogs.value.length, 1)
    assert.equal(second.hasImportSession.value, true)

    second.clearImportSession()
    assert.equal(first.importProgress.value.total, 0)
    assert.equal(first.importLogs.value.length, 0)
    assert.equal(first.hasImportSession.value, false)
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
