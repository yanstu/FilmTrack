import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { __videoSourceInternals } from '../src/services/video-source.ts'

/**
 * 播放链路 / 片单加载 性能优化回归测试
 *
 * 分两层：
 *  1) 纯函数单测（不依赖网络 / DOM）：骨架片单、匹配缓存键；
 *  2) 契约断言（读源文件）：锁定无法在本 harness 里直接跑网络的优化点
 *     —— 匹配两轮并行(B)、片单 SWR(A)、匹配/详情缓存(C)、打开详情并行水合(D)。
 */

const read = (relativePath) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8')

describe('片单首屏骨架 buildSkeletonProfiles（A：首次无缓存即时展示）', () => {
  it('为每个内置片单生成占位项，可用性留待后台探测回填', () => {
    const skeleton = __videoSourceInternals.buildSkeletonProfiles()

    assert.equal(skeleton.length, __videoSourceInternals.profilePresetCount)
    assert.deepEqual(
      skeleton.map((item) => item.id),
      __videoSourceInternals.profilePresetIds
    )
    for (const item of skeleton) {
      assert.equal(item.available, false)
      assert.equal(item.sourceCount, 0)
      assert.ok(item.name.length > 0, '骨架应保留片单名以便即时展示')
      assert.ok(item.description.length > 0, '骨架应保留片单描述')
    }
  })
})

describe('匹配缓存键 buildMatchCacheKey（C：同片复用、换片单/换片重算）', () => {
  const context = { movieId: 'movie-1', title: '仙逆', mediaType: 'tv' }

  it('相同影片 + 片单 + 策略生成稳定的键', () => {
    const a = __videoSourceInternals.buildMatchCacheKey(context, 'jingxuan')
    const b = __videoSourceInternals.buildMatchCacheKey(context, 'jingxuan')
    assert.equal(a, b)
    assert.ok(a.includes('movie-1'), '键应包含影片标识')
    assert.ok(a.includes('jingxuan'), '键应包含片单标识')
  })

  it('换影片或换片单都会得到不同的键，避免错误复用', () => {
    const base = __videoSourceInternals.buildMatchCacheKey(context, 'jingxuan')
    const otherMovie = __videoSourceInternals.buildMatchCacheKey({ ...context, movieId: 'movie-2' }, 'jingxuan')
    const otherProfile = __videoSourceInternals.buildMatchCacheKey(context, 'fongmi')

    assert.notEqual(base, otherMovie)
    assert.notEqual(base, otherProfile)
  })

  it('缺少 movieId 时回退用标题作键，避免空键互相串扰', () => {
    const key = __videoSourceInternals.buildMatchCacheKey({ title: '凡人修仙传', mediaType: 'tv' }, 'jingxuan')
    assert.ok(key.includes('凡人修仙传'))
  })
})

describe('源码契约：片单 SWR 与缓存（A/C）', () => {
  const videoSource = read('src/services/video-source.ts')

  it('声明了匹配缓存 / 详情缓存 / 后台刷新去重', () => {
    assert.ok(videoSource.includes('matchResultCache'), '应有匹配结果缓存')
    assert.ok(videoSource.includes('videoDetailCache'), '应有影片详情缓存')
    assert.ok(videoSource.includes('backgroundProfileRefresh'), '应有后台刷新去重句柄')
  })

  it('getSourceProfiles 走 SWR：命中过期则后台刷新、无缓存先回骨架', () => {
    assert.ok(videoSource.includes('readCachedProfilesRaw'), 'SWR 需读取允许过期的缓存')
    assert.ok(videoSource.includes('triggerBackgroundProfileRefresh'), '过期/无缓存应触发后台刷新')
    assert.ok(videoSource.includes('buildSkeletonProfiles()'), '首次无缓存应返回骨架')
    assert.ok(videoSource.includes('export function whenSourceProfilesRefreshed'), '需暴露后台刷新完成的通知')
  })

  it('loadVideoDetail 命中详情缓存即返回，免重复拉剧集清单', () => {
    assert.ok(videoSource.includes('const cachedDetail = videoDetailCache.get('), '详情读取应先查缓存')
    assert.ok(videoSource.includes('videoDetailCache.set('), '详情解析成功应写入缓存')
  })

  it('refreshSourceProfiles 为真正强制刷新，并清空相关缓存', () => {
    assert.ok(videoSource.includes('matchResultCache.clear()'), '强刷应清匹配缓存')
    assert.ok(videoSource.includes('videoDetailCache.clear()'), '强刷应清详情缓存')
    assert.ok(videoSource.includes('await resolveAllProfiles()'), '强刷应等待真正的全量解析')
  })
})

describe('源码契约：匹配两轮并行（B）', () => {
  const videoSource = read('src/services/video-source.ts')

  it('标题 + 原名两轮搜索改为 Promise.all 并行', () => {
    assert.ok(
      videoSource.includes('always.map((keyword) => searchKeywordAcrossSources(profile, keyword, context))'),
      '主关键词应并行搜索'
    )
    assert.ok(
      videoSource.includes('fallback.map((keyword) => searchKeywordAcrossSources(profile, keyword, context))'),
      '兜底关键词应并行补搜'
    )
    assert.ok(
      !/for \(const keyword of always\)/.test(videoSource),
      '不应再串行遍历主关键词'
    )
  })

  it('matchMovieSources 命中缓存直接返回、仅缓存有候选的结果', () => {
    assert.ok(videoSource.includes('const cached = matchResultCache.get(cacheKey)'), '应先查匹配缓存')
    assert.ok(videoSource.includes('if (payload.candidates.length > 0)'), '仅缓存有候选的结果以便空结果自愈')
  })
})

describe('源码契约：打开详情并行水合（D）', () => {
  it('useDetailPlayer 打开时进度水合与片源匹配并行', () => {
    const player = read('src/views/Detail/composables/useDetailPlayer.ts')
    assert.ok(player.includes('Promise.all(['), '打开详情应并行执行')
    assert.ok(player.includes('hydrateLatestProgress(movieId)'), '应包含最近进度水合')
    assert.ok(player.includes('matchSources(true)'), '应包含片源匹配')
  })

  it('App.vue 在后台刷新完成后静默回填片单列表', () => {
    const app = read('src/App.vue')
    assert.ok(app.includes('whenSourceProfilesRefreshed'), 'App 应订阅后台刷新完成')
  })
})
