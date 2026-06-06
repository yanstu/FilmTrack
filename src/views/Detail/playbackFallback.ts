/**
 * 详情页播放自动回退策略（纯函数，便于单元测试）。
 *
 * 设计目标：在「配置留在设置页、详情页只管选集+播放」的前提下，
 * 让播放链路在失败时自动穷尽可用线路 / 片源，全部失败才提示去设置换源，
 * 从而在不把片源管理搬到详情页的情况下也能形成可用闭环。
 */

export interface FallbackCandidate {
  sourceKey: string;
  vodId: string;
}

export interface FallbackDetail {
  sourceKey: string;
  vodId: string;
  sources: { name: string }[];
}

export type FallbackPlan =
  | { type: 'group'; groupName: string }
  | { type: 'candidate'; sourceKey: string; vodId: string }
  | { type: 'none' };

/** 候选片源唯一键：sourceKey + vodId */
export function candidateKey(sourceKey: string, vodId: string): string {
  return `${sourceKey}@@${vodId}`;
}

/** 线路唯一键：候选片源 + 线路名 */
export function groupKey(sourceKey: string, vodId: string, groupName: string): string {
  return `${candidateKey(sourceKey, vodId)}@@${groupName}`;
}

/**
 * 计算下一步回退动作：
 * 1. 优先在当前片源里换一条「未试过」的线路；
 * 2. 当前片源线路用尽后，换一个「未试过」的候选片源；
 * 3. 都用尽则返回 none（交由调用方进入终态错误，引导去设置换源）。
 */
export function planPlaybackFallback(params: {
  detail: FallbackDetail | null;
  candidates: FallbackCandidate[];
  triedGroups: ReadonlySet<string>;
  triedCandidates: ReadonlySet<string>;
}): FallbackPlan {
  const { detail, candidates, triedGroups, triedCandidates } = params;

  if (detail) {
    const nextGroup = detail.sources.find(
      (group) => !triedGroups.has(groupKey(detail.sourceKey, detail.vodId, group.name))
    );
    if (nextGroup) {
      return { type: 'group', groupName: nextGroup.name };
    }
  }

  const nextCandidate = candidates.find(
    (candidate) => !triedCandidates.has(candidateKey(candidate.sourceKey, candidate.vodId))
  );
  if (nextCandidate) {
    return { type: 'candidate', sourceKey: nextCandidate.sourceKey, vodId: nextCandidate.vodId };
  }

  return { type: 'none' };
}
