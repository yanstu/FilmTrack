import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  encodePlaybackCandidateValue,
  decodePlaybackCandidateValue
} from '../src/views/Detail/playbackCandidate.ts'
import { tvReminderService } from '../src/services/reminder.ts'
import { simplifyKeyword, parsePlayGroups } from '../src/services/video-source.ts'
import {
  candidateKey,
  groupKey,
  planPlaybackFallback
} from '../src/views/Detail/playbackFallback.ts'
import { DEFAULT_APP_SETTINGS, mergeAppSettings } from '../src/utils/appSettings.ts'
import * as apiModule from '../src/utils/api.ts'

const originalGetTVDetails = apiModule.tmdbAPI.getTVDetails

beforeEach(() => {
  apiModule.tmdbAPI.getTVDetails = originalGetTVDetails
})

afterEach(() => {
  apiModule.tmdbAPI.getTVDetails = originalGetTVDetails
})

/**
 * 详情页换源依赖的「片源候选值」编解码：
 * 片源下拉的 option value 把 sourceKey + vodId 编码成单一字符串，切换时再解码还原。
 */
describe('playbackCandidate 片源候选编解码', () => {
  it('编码后可无损解码回 sourceKey 与 vodId', () => {
    const sourceKey = 'haiwaikan@@https://haiwaikan.com/api.php/provide/vod'
    const vodId = 'vod-12345'

    const encoded = encodePlaybackCandidateValue(sourceKey, vodId)
    const decoded = decodePlaybackCandidateValue(encoded)

    assert.equal(decoded.sourceKey, sourceKey)
    assert.equal(decoded.vodId, vodId)
  })

  it('解码非法字符串时安全返回空值，避免换源链路崩溃', () => {
    const decoded = decodePlaybackCandidateValue('this-is-not-json')

    assert.equal(decoded.sourceKey, '')
    assert.equal(decoded.vodId, '')
  })
})

/**
 * 首页「更新提醒」数据层：只保留未来 N 天内将播出的剧集，并按播出日期分组。
 */
describe('tvReminderService 更新提醒过滤与分组', () => {
  const pad = (value) => String(value).padStart(2, '0')
  const toDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const shiftDays = (days) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + days)
    return date
  }

  it('过滤窗口外剧集，仅保留 7 天内的更新并按日期分组', async () => {
    const inRangeDate = toDate(shiftDays(2))
    const farDate = toDate(shiftDays(60))

    apiModule.tmdbAPI.getTVDetails = async (tmdbId) => {
      if (tmdbId === 101) {
        return {
          success: true,
          data: {
            next_episode_to_air: {
              air_date: inRangeDate,
              season_number: 2,
              episode_number: 5,
              name: '风起'
            }
          }
        }
      }
      if (tmdbId === 102) {
        return {
          success: true,
          data: {
            next_episode_to_air: {
              air_date: farDate,
              season_number: 1,
              episode_number: 9,
              name: '远方'
            }
          }
        }
      }
      return { success: true, data: {} }
    }

    const movies = [
      { id: 'a', type: 'tv', tmdb_id: 101, title: '剧集A', status: 'watching', poster_path: '/a.jpg' },
      { id: 'b', type: 'tv', tmdb_id: 102, title: '剧集B', status: 'watching', poster_path: '/b.jpg' },
      { id: 'c', type: 'movie', tmdb_id: 103, title: '电影C', status: 'watching', poster_path: '/c.jpg' }
    ]

    const result = await tvReminderService.getReminderGroups({ movies })

    assert.equal(result.success, true)
    assert.equal(result.data.length, 1)
    assert.equal(result.data[0].date, inRangeDate)
    assert.equal(result.data[0].items.length, 1)
    assert.equal(result.data[0].items[0].title, '剧集A')
    assert.equal(result.data[0].items[0].episode_number, 5)
  })

  it('没有可提醒剧集时返回空分组', async () => {
    apiModule.tmdbAPI.getTVDetails = async () => ({ success: true, data: {} })

    const result = await tvReminderService.getReminderGroups({
      movies: [
        { id: 'a', type: 'tv', tmdb_id: 201, title: '剧集A', status: 'watching', poster_path: '' }
      ]
    })

    assert.equal(result.success, true)
    assert.deepEqual(result.data, [])
  })
})

/**
 * 片源匹配稳健性：标题去噪生成更易命中采集站的兜底关键词。
 */
describe('video-source simplifyKeyword 标题去噪', () => {
  it('去除季 / 年份 / 括号等后缀，得到基础关键词', () => {
    assert.equal(simplifyKeyword('凡人修仙传 第二季'), '凡人修仙传')
    assert.equal(simplifyKeyword('仙逆（2023）'), '仙逆')
    assert.equal(simplifyKeyword('某番剧 Season 2'), '某番剧')
    assert.equal(simplifyKeyword('斗破苍穹 第5季 2024'), '斗破苍穹')
  })

  it('无噪声标题保持不变', () => {
    assert.equal(simplifyKeyword('仙逆'), '仙逆')
    assert.equal(simplifyKeyword('凡人修仙传'), '凡人修仙传')
  })
})

/**
 * 线路解析：过滤非直链剧集、并把可直链(m3u8)线路排在 share 播放页线路之前。
 */
describe('video-source parsePlayGroups 线路解析与直链优先', () => {
  it('可直链线路排在 share 播放页线路之前（自动选源优先直链）', () => {
    const playFrom = 'share线路$$$直链线路'
    const playUrl = [
      '第01集$https://v.example.com/share/abc#第02集$https://v.example.com/share/def',
      '第01集$https://v.example.com/20240101/x/index.m3u8#第02集$https://v.example.com/20240101/y/index.m3u8'
    ].join('$$$')

    const groups = parsePlayGroups(playFrom, playUrl)

    assert.equal(groups.length, 2)
    assert.equal(groups[0].name, '直链线路')
    assert.equal(groups[0].episodes.length, 2)
    assert.equal(groups[1].name, 'share线路')
  })

  it('剔除不含 http 地址的无效剧集与空线路', () => {
    const playFrom = '无效线路$$$有效线路'
    const playUrl = [
      '第01集$/vod/play/1-1-1#第02集$relative/path',
      '第01集$https://v.example.com/a/index.m3u8'
    ].join('$$$')

    const groups = parsePlayGroups(playFrom, playUrl)

    assert.equal(groups.length, 1)
    assert.equal(groups[0].name, '有效线路')
    assert.equal(groups[0].episodes.length, 1)
  })
})

/**
 * 详情页播放自动回退策略：当前线路失败先换线路，线路用尽再换片源，
 * 全部穷尽才返回 none（交由 UI 进入终态错误、引导去设置换源），从而形成闭环。
 */
describe('playbackFallback planPlaybackFallback 自动回退顺序', () => {
  const detail = {
    sourceKey: 'srcA',
    vodId: 'vodA',
    sources: [{ name: '线路1' }, { name: '线路2' }]
  }
  const candidates = [
    { sourceKey: 'srcA', vodId: 'vodA' },
    { sourceKey: 'srcB', vodId: 'vodB' }
  ]

  it('优先在当前片源里换一条未试过的线路', () => {
    const triedGroups = new Set([groupKey('srcA', 'vodA', '线路1')])
    const triedCandidates = new Set()

    const plan = planPlaybackFallback({ detail, candidates, triedGroups, triedCandidates })

    assert.deepEqual(plan, { type: 'group', groupName: '线路2' })
  })

  it('当前片源线路用尽后换下一个候选片源', () => {
    const triedGroups = new Set([
      groupKey('srcA', 'vodA', '线路1'),
      groupKey('srcA', 'vodA', '线路2')
    ])
    const triedCandidates = new Set([candidateKey('srcA', 'vodA')])

    const plan = planPlaybackFallback({ detail, candidates, triedGroups, triedCandidates })

    assert.deepEqual(plan, { type: 'candidate', sourceKey: 'srcB', vodId: 'vodB' })
  })

  it('没有详情时直接选下一个未试过的候选片源', () => {
    const plan = planPlaybackFallback({
      detail: null,
      candidates,
      triedGroups: new Set(),
      triedCandidates: new Set([candidateKey('srcA', 'vodA')])
    })

    assert.deepEqual(plan, { type: 'candidate', sourceKey: 'srcB', vodId: 'vodB' })
  })

  it('线路与候选片源全部穷尽时返回 none', () => {
    const triedGroups = new Set([
      groupKey('srcA', 'vodA', '线路1'),
      groupKey('srcA', 'vodA', '线路2')
    ])
    const triedCandidates = new Set([
      candidateKey('srcA', 'vodA'),
      candidateKey('srcB', 'vodB')
    ])

    const plan = planPlaybackFallback({ detail, candidates, triedGroups, triedCandidates })

    assert.deepEqual(plan, { type: 'none' })
  })
})

/**
 * 默认片单：改为内置「精选可用源」（jingxuan），但已保存的用户选择优先。
 */
describe('appSettings 默认片单', () => {
  it('默认启用内置「精选可用源」片单', () => {
    assert.equal(DEFAULT_APP_SETTINGS.videoSource.activeProfileId, 'jingxuan')
  })

  it('用户已保存的片单选择优先于默认，其它字段回落默认', () => {
    const merged = mergeAppSettings({ videoSource: { activeProfileId: 'fongmi' } })
    assert.equal(merged.videoSource.activeProfileId, 'fongmi')
    assert.equal(merged.videoSource.resumePlayback, DEFAULT_APP_SETTINGS.videoSource.resumePlayback)
  })
})
