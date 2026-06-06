import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

/**
 * 文案一致性契约：统一第二人称「你」、危险操作口语化、关键空状态/提示口语化。
 * 守护本轮文案通扫不被回退。
 */

const read = (relativePath) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8')

const includes = (source, needle, message) =>
  assert.ok(source.includes(needle), `${message ?? '缺少文案'}\n缺少片段: ${needle}`)

const excludes = (source, needle, message) =>
  assert.ok(!source.includes(needle), `${message ?? '存在不该出现的文案'}\n仍存在: ${needle}`)

describe('第二人称统一为「你」', () => {
  const files = [
    'src/views/History.vue',
    'src/views/Record/components/UserRecordForm.vue',
    'src/components/ui/EditRecordModal.vue',
    'src/views/Library/components/DeleteConfirmDialog.vue',
    'src/views/Library/components/LibraryStates.vue',
    'src/views/Import/index.vue',
  ]

  for (const file of files) {
    it(`${file} 不再出现正式的「您」`, () => {
      excludes(read(file), '您', '应统一为口语化的「你」')
    })
  }
})

describe('空状态 / 提示口语化', () => {
  it('影视库空状态', () => {
    const s = read('src/views/Library/components/LibraryStates.vue')
    includes(s, '影视库还是空的')
    includes(s, '没找到相关作品')
  })

  it('详情找不到作品', () => {
    includes(read('src/views/Detail/index.vue'), '找不到这部作品')
  })

  it('首页最近观看 / 追剧空状态', () => {
    const home = read('src/views/Home.vue')
    includes(home, '还没有最近观看记录')
    includes(home, '还没有在追的作品')
  })
})

describe('危险操作 / 校验提示口语化', () => {
  it('设置清空数据不再用生硬的「此操作不可恢复」', () => {
    excludes(read('src/components/ui/SettingsModal.vue'), '此操作不可恢复', '危险提示应口语化')
  })

  it('删除确认口语化（删了就找不回来了）', () => {
    includes(read('src/views/Library/components/DeleteConfirmDialog.vue'), '删了就找不回来了')
  })

  it('日期校验提示口语化', () => {
    excludes(read('src/views/Record/composables/useFormLogic.ts'), '请选择正确的观看日期')
  })
})
