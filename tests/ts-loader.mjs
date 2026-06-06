const CANDIDATE_SUFFIXES = [
  '.ts',
  '.js',
  '/index.ts',
  '/index.js'
]

const RESOLVABLE_EXTENSIONS = ['.ts', '.js', '.mjs', '.cjs', '.json']

const hasExplicitExtension = (specifier) =>
  RESOLVABLE_EXTENSIONS.some((extension) => specifier.endsWith(extension))

export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context, defaultResolve)
  } catch (error) {
    const isRelativeLike =
      specifier.startsWith('./') ||
      specifier.startsWith('../') ||
      specifier.startsWith('/')

    if (!isRelativeLike || hasExplicitExtension(specifier)) {
      throw error
    }

    for (const suffix of CANDIDATE_SUFFIXES) {
      try {
        return await defaultResolve(`${specifier}${suffix}`, context, defaultResolve)
      } catch {
        // 继续尝试其他候选路径
      }
    }

    throw error
  }
}
