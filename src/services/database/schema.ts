/**
 * 数据库表结构定义
 * 负责数据库表的创建、备份和版本化迁移
 * @author yanstu
 */

import { BaseDirectory, copyFile, exists, mkdir } from '@tauri-apps/plugin-fs'
import { DatabaseConnection } from './connection'

type Migration = {
  version: number
  name: string
  up: (db: Awaited<ReturnType<typeof DatabaseConnection.getRawInstance>>) => Promise<void>
}

const LATEST_SCHEMA_VERSION = 2

const MOVIES_TABLE_SQL = `CREATE TABLE IF NOT EXISTS movies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  original_title TEXT,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  tmdb_id INTEGER,
  tmdb_rating REAL DEFAULT 0.0,
  personal_rating REAL CHECK (personal_rating >= 0 AND personal_rating <= 10),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('watching', 'completed', 'planned', 'paused', 'dropped')),
  type TEXT NOT NULL DEFAULT 'movie' CHECK (type IN ('movie', 'tv')),
  year INTEGER,
  runtime INTEGER,
  genres TEXT,
  current_episode INTEGER DEFAULT 0,
  total_episodes INTEGER,
  current_season INTEGER DEFAULT 1,
  total_seasons INTEGER,
  seasons_data TEXT,
  air_status TEXT,
  watch_source TEXT,
  watched_date TEXT,
  notes TEXT,
  watch_count INTEGER DEFAULT 0,
  date_added TEXT,
  date_updated TEXT,
  created_at TEXT,
  updated_at TEXT,
  tags TEXT
)`

const REPLAY_RECORDS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS replay_records (
  id TEXT PRIMARY KEY,
  movie_id TEXT NOT NULL,
  watch_date TEXT NOT NULL,
  episode INTEGER,
  season INTEGER,
  duration INTEGER DEFAULT 0,
  progress REAL DEFAULT 0.0 CHECK (progress >= 0 AND progress <= 1),
  rating REAL CHECK (rating >= 0 AND rating <= 5),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
)`

const MOVIES_COLUMN_MIGRATIONS = [
  'ALTER TABLE movies ADD COLUMN original_title TEXT',
  'ALTER TABLE movies ADD COLUMN backdrop_path TEXT',
  'ALTER TABLE movies ADD COLUMN tmdb_id INTEGER',
  'ALTER TABLE movies ADD COLUMN tmdb_rating REAL',
  'ALTER TABLE movies ADD COLUMN personal_rating REAL',
  'ALTER TABLE movies ADD COLUMN type TEXT',
  'ALTER TABLE movies ADD COLUMN year INTEGER',
  'ALTER TABLE movies ADD COLUMN runtime INTEGER',
  'ALTER TABLE movies ADD COLUMN genres TEXT',
  'ALTER TABLE movies ADD COLUMN current_episode INTEGER',
  'ALTER TABLE movies ADD COLUMN total_episodes INTEGER',
  'ALTER TABLE movies ADD COLUMN current_season INTEGER',
  'ALTER TABLE movies ADD COLUMN total_seasons INTEGER',
  'ALTER TABLE movies ADD COLUMN seasons_data TEXT',
  'ALTER TABLE movies ADD COLUMN air_status TEXT',
  'ALTER TABLE movies ADD COLUMN watch_source TEXT',
  'ALTER TABLE movies ADD COLUMN watched_date TEXT',
  'ALTER TABLE movies ADD COLUMN notes TEXT',
  'ALTER TABLE movies ADD COLUMN watch_count INTEGER',
  'ALTER TABLE movies ADD COLUMN date_added TEXT',
  'ALTER TABLE movies ADD COLUMN date_updated TEXT',
  'ALTER TABLE movies ADD COLUMN created_at TEXT',
  'ALTER TABLE movies ADD COLUMN updated_at TEXT',
  'ALTER TABLE movies ADD COLUMN tags TEXT'
] as const

const REPLAY_RECORDS_COLUMN_MIGRATIONS = [
  'ALTER TABLE replay_records ADD COLUMN episode INTEGER',
  'ALTER TABLE replay_records ADD COLUMN season INTEGER',
  'ALTER TABLE replay_records ADD COLUMN duration INTEGER',
  'ALTER TABLE replay_records ADD COLUMN progress REAL',
  'ALTER TABLE replay_records ADD COLUMN rating REAL',
  'ALTER TABLE replay_records ADD COLUMN notes TEXT',
  'ALTER TABLE replay_records ADD COLUMN created_at TEXT',
  'ALTER TABLE replay_records ADD COLUMN updated_at TEXT'
] as const

const INDEX_COMMANDS = [
  'CREATE INDEX IF NOT EXISTS idx_movies_status ON movies(status)',
  'CREATE INDEX IF NOT EXISTS idx_movies_type ON movies(type)',
  'CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id)',
  'CREATE INDEX IF NOT EXISTS idx_movies_date_updated ON movies(date_updated)',
  'CREATE INDEX IF NOT EXISTS idx_replay_records_movie_id ON replay_records(movie_id)',
  'CREATE INDEX IF NOT EXISTS idx_replay_records_watch_date ON replay_records(watch_date)',
  'CREATE INDEX IF NOT EXISTS idx_replay_records_movie_date ON replay_records(movie_id, watch_date)'
] as const

const DATABASE_BASE_DIR = BaseDirectory.AppConfig

/**
 * 数据库表结构管理类
 */
export class DatabaseSchema {
  private static initialized = false
  private static fs = {
    exists,
    mkdir,
    copyFile
  }
  private static migrations: Migration[] = [
    {
      version: 1,
      name: 'baseline-schema',
      up: async (db) => {
        await this.ensureBaseTables(db)
        await this.ensureBaseColumns(db)
        await this.backfillLegacyData(db)
        await this.ensureIndexes(db)
      }
    },
    {
      version: 2,
      name: 'normalize-defaults',
      up: async (db) => {
        await db.execute(`
          UPDATE movies SET
            type = COALESCE(type, 'movie'),
            status = COALESCE(status, 'planned'),
            current_episode = COALESCE(current_episode, 0),
            current_season = COALESCE(current_season, 1),
            watch_count = COALESCE(watch_count, 0),
            tmdb_rating = COALESCE(tmdb_rating, 0.0),
            tags = COALESCE(tags, '[]')
          WHERE type IS NULL
            OR status IS NULL
            OR current_episode IS NULL
            OR current_season IS NULL
            OR watch_count IS NULL
            OR tmdb_rating IS NULL
            OR tags IS NULL
        `)

        await db.execute(`
          UPDATE replay_records SET
            duration = COALESCE(duration, 0),
            progress = COALESCE(progress, 0.0),
            updated_at = COALESCE(updated_at, created_at, ?)
          WHERE duration IS NULL
            OR progress IS NULL
            OR updated_at IS NULL
        `, [new Date().toISOString()])
      }
    }
  ]

  /**
   * 确保表结构包含所有必要字段
   */
  static async ensureTableStructure(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      const db = await DatabaseConnection.getRawInstance()

      try {
        await db.execute('SELECT 1')
      } catch (permissionError) {
        console.error('数据库权限不足，请检查Tauri配置:', permissionError)
        throw new Error('数据库权限不足，无法执行SQL命令。请检查tauri.conf.json中的SQL权限配置。')
      }

      await this.ensureMigrationTable()
      await this.runPendingMigrations()
      this.initialized = true
    } catch (error) {
      this.initialized = false
      console.error('数据库表结构初始化失败:', error)
      throw error
    }
  }

  static resetInitializationState(): void {
    this.initialized = false
  }

  private static async ensureMigrationTable(): Promise<void> {
    const db = await DatabaseConnection.getRawInstance()
    await db.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      )
    `)
  }

  private static async runPendingMigrations(): Promise<void> {
    const db = await DatabaseConnection.getRawInstance()
    const appliedVersions = await this.getAppliedVersions()
    const pendingMigrations = this.migrations.filter(
      migration => !appliedVersions.has(migration.version)
    )

    if (pendingMigrations.length === 0) {
      return
    }

    await this.ensureDatabaseBackup()

    for (const migration of pendingMigrations) {
      try {
        await db.execute('BEGIN TRANSACTION')
        await migration.up(db)
        await db.execute(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, $3)',
          [migration.version, migration.name, new Date().toISOString()]
        )
        await db.execute('COMMIT')
      } catch (error) {
        try {
          await db.execute('ROLLBACK')
        } catch (rollbackError) {
          console.warn('数据库回滚失败:', rollbackError)
        }

        throw new Error(`数据库迁移失败 [v${migration.version} ${migration.name}]: ${error}`)
      }
    }
  }

  private static async getAppliedVersions(): Promise<Set<number>> {
    const db = await DatabaseConnection.getRawInstance()
    const result = await db.select(
      'SELECT version FROM schema_migrations ORDER BY version ASC'
    ) as Array<{ version: number | string }>

    return new Set(result.map(row => Number(row.version)))
  }

  private static async ensureBaseTables(
    db: Awaited<ReturnType<typeof DatabaseConnection.getRawInstance>>
  ): Promise<void> {
    await db.execute(MOVIES_TABLE_SQL)
    await db.execute(REPLAY_RECORDS_TABLE_SQL)
  }

  private static async ensureBaseColumns(
    db: Awaited<ReturnType<typeof DatabaseConnection.getRawInstance>>
  ): Promise<void> {
    for (const command of MOVIES_COLUMN_MIGRATIONS) {
      await this.executeIgnoreDuplicate(db, command)
    }

    for (const command of REPLAY_RECORDS_COLUMN_MIGRATIONS) {
      await this.executeIgnoreDuplicate(db, command)
    }
  }

  private static async backfillLegacyData(
    db: Awaited<ReturnType<typeof DatabaseConnection.getRawInstance>>
  ): Promise<void> {
    const currentTime = new Date().toISOString()

    await db.execute(`
      UPDATE movies SET
        date_added = COALESCE(date_added, watched_date, created_at, ?),
        date_updated = COALESCE(date_updated, watched_date, updated_at, created_at, ?),
        created_at = COALESCE(created_at, date_added, ?),
        updated_at = COALESCE(updated_at, date_updated, created_at, ?),
        current_episode = COALESCE(current_episode, 0),
        current_season = COALESCE(current_season, 1),
        watch_count = COALESCE(watch_count, 0),
        tmdb_rating = COALESCE(tmdb_rating, 0.0),
        tags = COALESCE(tags, '[]')
      WHERE date_added IS NULL
        OR date_updated IS NULL
        OR created_at IS NULL
        OR updated_at IS NULL
        OR current_episode IS NULL
        OR current_season IS NULL
        OR watch_count IS NULL
        OR tmdb_rating IS NULL
        OR tags IS NULL
    `, [currentTime, currentTime, currentTime, currentTime])

    await db.execute(`
      UPDATE replay_records SET
        duration = COALESCE(duration, 0),
        progress = COALESCE(progress, 0.0),
        created_at = COALESCE(created_at, watch_date, ?),
        updated_at = COALESCE(updated_at, created_at, watch_date, ?)
      WHERE duration IS NULL
        OR progress IS NULL
        OR created_at IS NULL
        OR updated_at IS NULL
    `, [currentTime, currentTime])
  }

  private static async ensureIndexes(
    db: Awaited<ReturnType<typeof DatabaseConnection.getRawInstance>>
  ): Promise<void> {
    for (const command of INDEX_COMMANDS) {
      await db.execute(command)
    }
  }

  private static async ensureDatabaseBackup(): Promise<void> {
    const dbFile = 'filmtrack.db'

    try {
      const databaseExists = await this.fs.exists(dbFile, { baseDir: DATABASE_BASE_DIR })
      if (!databaseExists) {
        return
      }

      await this.fs.mkdir('backups', {
        baseDir: DATABASE_BASE_DIR,
        recursive: true
      })

      const currentVersion = await this.getCurrentSchemaVersion()
      const backupFile = `backups/${dbFile}.v${currentVersion}-to-v${LATEST_SCHEMA_VERSION}-${this.getBackupTimestamp()}.bak`

      const backupExists = await this.fs.exists(backupFile, { baseDir: DATABASE_BASE_DIR })
      if (backupExists) {
        return
      }

      await this.fs.copyFile(dbFile, backupFile, {
        fromPathBaseDir: DATABASE_BASE_DIR,
        toPathBaseDir: DATABASE_BASE_DIR
      })
    } catch (error) {
      console.warn('数据库迁移前备份失败，已跳过自动备份:', {
        baseDir: DATABASE_BASE_DIR,
        dbFile,
        error
      })
    }
  }

  private static async getCurrentSchemaVersion(): Promise<number> {
    const db = await DatabaseConnection.getRawInstance()
    const result = await db.select(
      'SELECT MAX(version) as version FROM schema_migrations'
    ) as Array<{ version: number | string | null }>

    const version = result[0]?.version
    return version == null ? 0 : Number(version)
  }

  private static getBackupTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-')
  }

  private static async executeIgnoreDuplicate(
    db: Awaited<ReturnType<typeof DatabaseConnection.getRawInstance>>,
    sql: string
  ): Promise<void> {
    try {
      await db.execute(sql)
    } catch (error) {
      const message = String(error).toLowerCase()
      if (
        !message.includes('duplicate column name') &&
        !message.includes('already exists')
      ) {
        throw error
      }
    }
  }
}
