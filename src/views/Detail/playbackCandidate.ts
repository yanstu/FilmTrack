/**
 * 片源候选值编解码
 *
 * 详情页「片源」下拉的 option value 需要把 sourceKey + vodId 编成单一字符串，
 * 选择时再解码还原。sourceKey 可能包含特殊字符（如完整 API 地址），用 JSON 编码最稳妥。
 */

export function encodePlaybackCandidateValue(sourceKey: string, vodId: string): string {
  return JSON.stringify({ sourceKey, vodId });
}

export function decodePlaybackCandidateValue(value: string): { sourceKey: string; vodId: string } {
  try {
    const parsed = JSON.parse(value) as { sourceKey?: string; vodId?: string };
    return {
      sourceKey: parsed.sourceKey || '',
      vodId: parsed.vodId || ''
    };
  } catch {
    return { sourceKey: '', vodId: '' };
  }
}
