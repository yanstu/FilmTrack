import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const read = (relativePath) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8')

const includes = (source, needle, message) =>
  assert.ok(source.includes(needle), `${message ?? '缺少片段'}: ${needle}`)

const excludes = (source, needle, message) =>
  assert.ok(!source.includes(needle), `${message ?? '存在不该出现的片段'}: ${needle}`)

describe('发布工作流（GitHub Actions / tauri-action）', () => {
  const wf = read('.github/workflows/release.yml')

  it('由 v* 标签触发，并可手动触发', () => {
    includes(wf, "tags:", '应配置 tag 触发')
    includes(wf, "v*", '应匹配 v* 标签')
    includes(wf, 'workflow_dispatch', '应支持手动触发')
  })

  it('使用 tauri-action，覆盖 macOS universal 与 Windows', () => {
    includes(wf, 'tauri-apps/tauri-action', '应使用官方 tauri-action')
    includes(wf, 'universal-apple-darwin', 'macOS 应构建 universal 通用包')
    includes(wf, 'macos-latest', '应包含 macOS runner')
    includes(wf, 'windows-latest', '应包含 Windows runner')
  })

  it('具备发布所需权限与 token', () => {
    includes(wf, 'contents: write', '应授予写权限以创建 Release')
    includes(wf, 'secrets.GITHUB_TOKEN', '应使用 GITHUB_TOKEN')
  })
})

describe('版本一致性与出包脚本', () => {
  const tauriConf = JSON.parse(read('src-tauri/tauri.conf.json'))
  const cargo = read('src-tauri/Cargo.toml')
  const lock = read('package-lock.json')
  const eslintConfig = read('eslint.config.js')
  const cargoVersion = (cargo.match(/^version\s*=\s*"([^"]+)"/m) || [])[1]
  const script = read('scripts/release.mjs')
  const pkg = JSON.parse(read('package.json'))

  it('tauri.conf.json 与 Cargo.toml 版本一致', () => {
    assert.equal(
      tauriConf.version,
      cargoVersion,
      `版本不一致：tauri=${tauriConf.version} cargo=${cargoVersion}`
    )
  })

  it('出包脚本会校验版本一致性与可选 tag', () => {
    includes(script, '版本不一致', '脚本应校验版本一致性')
    includes(script, '--check', '脚本应支持仅校验模式')
    includes(script, '--universal', '脚本应支持 macOS universal 构建')
  })

  it('lint 使用本地 ESLint 依赖与 flat config，而不是依赖 npx 临时版本', () => {
    includes(lock, '"eslint"', 'package-lock 应锁定 eslint 依赖')
    includes(eslintConfig, 'export default', '项目应提供 eslint flat config')
    includes(eslintConfig, 'vue', '配置应覆盖 Vue 文件')
    includes(eslintConfig, 'typescript', '配置应覆盖 TypeScript 文件')
    includes(
      pkg.scripts.lint,
      'eslint .',
      'lint 脚本应直接调用 eslint'
    )
    excludes(
      pkg.scripts.lint,
      '--ignore-path',
      'lint 脚本不应再使用不兼容的 --ignore-path'
    )
    excludes(
      pkg.scripts.lint,
      'npx eslint',
      'lint 脚本不应依赖 npx 临时拉取 eslint'
    )
  })
})

describe('README / 包元数据链接指向真实仓库 FilmTrack', () => {
  const readme = read('README.md')
  const pkg = read('package.json')
  const cargo = read('src-tauri/Cargo.toml')

  it('README 链接正确且无失效的 FilmTrackPro 仓库地址', () => {
    includes(readme, 'github.com/yanstu/FilmTrack/releases', '应有正确的 Releases 链接')
    excludes(readme, 'yanstu/FilmTrackPro', '不应再出现失效的 FilmTrackPro 仓库链接')
  })

  it('package.json / Cargo.toml 不再指向 FilmTrackPro', () => {
    excludes(pkg, 'yanstu/FilmTrackPro', 'package.json 不应指向 FilmTrackPro')
    excludes(cargo, 'yanstu/FilmTrackPro', 'Cargo.toml 不应指向 FilmTrackPro')
  })

  it('README 提供未签名应用的首启放行说明', () => {
    includes(readme, 'quarantine', '应说明 macOS 放行方式')
    includes(readme, 'SmartScreen', '应说明 Windows 放行方式')
  })
})
