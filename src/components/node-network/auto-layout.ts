import { Edge } from '@xyflow/react';
import { GraphNode } from './node-network-store';

type LayoutOptions = {
  startX?: number;
  startY?: number;
  xGap?: number;
  yGap?: number;
};

/**
 * Very simple layered auto-layout for DAG-like graphs.
 * - Computes ranks by longest path from nodes with zero in-degree
 * - Places columns by rank with constant horizontal spacing
 * - Orders within a rank by id (stable, deterministic)
 * - Places rows with constant vertical spacing
 */
export function autoLayoutNodes(
  nodes: GraphNode[],
  edges: Edge[],
  options: LayoutOptions = {},
): GraphNode[] {
  const startX = options.startX ?? 0;
  const startY = options.startY ?? 0;
  const xGap = options.xGap ?? 280;
  const yGap = options.yGap ?? 120;

  const nodeIdToIndex = new Map<string, number>();
  nodes.forEach((n, i) => nodeIdToIndex.set(n.id, i));

  // Build in/out degree maps
  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    outgoing.set(n.id, []);
  });

  edges.forEach((e) => {
    const source = e.source;
    const target = e.target;
    if (!outgoing.has(source)) outgoing.set(source, []);
    outgoing.get(source)!.push(target);
    inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
  });

  // Kahn's algorithm to get topological order and longest-path ranks
  const queue: string[] = [];
  const rank = new Map<string, number>();
  inDegree.forEach((deg, id) => {
    if (deg === 0) {
      queue.push(id);
      rank.set(id, 0);
    }
  });

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    topoOrder.push(id);
    const currentRank = rank.get(id) ?? 0;
    const nexts = outgoing.get(id) ?? [];
    for (const t of nexts) {
      // longest path rank
      rank.set(t, Math.max(rank.get(t) ?? 0, currentRank + 1));
      const nextIn = (inDegree.get(t) ?? 0) - 1;
      inDegree.set(t, nextIn);
      if (nextIn === 0) queue.push(t);
    }
  }

  // Fallback: if graph had cycles or something odd, assign sequential ranks
  if (topoOrder.length !== nodes.length) {
    nodes.forEach((n, i) => rank.set(n.id, i));
  }

  // Group by rank
  const rankToIds = new Map<number, string[]>();
  nodes.forEach((n) => {
    const r = rank.get(n.id) ?? 0;
    if (!rankToIds.has(r)) rankToIds.set(r, []);
    rankToIds.get(r)!.push(n.id);
  });

  // Sort ids within each rank for determinism
  Array.from(rankToIds.keys()).forEach((r) => {
    const ids = rankToIds.get(r)!;
    ids.sort((a, b) => a.localeCompare(b));
    rankToIds.set(r, ids);
  });

  // Compute positions
  const maxRank = Math.max(...Array.from(rankToIds.keys()));
  const newNodes = nodes.map((n) => ({ ...n }));

  for (let r = 0; r <= maxRank; r++) {
    const ids = rankToIds.get(r) ?? [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const nodeIndex = nodeIdToIndex.get(id);
      if (nodeIndex === undefined) continue;
      const x = startX + r * xGap;
      const y = startY + i * yGap;
      newNodes[nodeIndex] = {
        ...newNodes[nodeIndex],
        position: { x, y },
      };
    }
  }

  return newNodes;
}
