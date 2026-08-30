# src\engine\probabilistic\knowledgeGraph.js

```js
/**
 * knowledgeGraph.js
 *
 * Lote 7 — Knowledge Graph + PageRank para priorização estrutural de tópicos.
 *
 * Conceitos:
 * - edges: pré-requisito -> tópico dependente
 * - PageRank: mede importância estrutural do tópico
 * - prereqReadiness: quão pronto está o pré-requisito
 * - blockedBy: pré-requisitos fracos que bloqueiam o tópico
 *
 * Configuração global opcional:
 *
 * globalThis.__COACH_KNOWLEDGE_GRAPH__ = {
 *   "Matemática": {
 *     prerequisites: {
 *       "Derivadas": ["Funções", "Limites"],
 *       "Integração": ["Derivadas"]
 *     }
 *   }
 * };
 */

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeGraphName(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Retorna o grafo configurado para uma categoria.
 */
export function getKnowledgeGraphForCategory(categoryName) {
  try {
    const root = globalThis.__COACH_KNOWLEDGE_GRAPH__;
    if (!root || typeof root !== 'object') return null;

    const target = normalizeGraphName(categoryName);

    const key = Object.keys(root).find(
      (k) => normalizeGraphName(k) === target
    );

    if (key) return root[key];

    return root.default || null;
  } catch {
    return null;
  }
}

/**
 * Calcula métricas de grafo para tópicos.
 *
 * @param {Array<Object>} topics
 * Exemplo:
 * [
 *   { name: 'Funções', proficiency: 0.75, evidence: 0.8 },
 *   { name: 'Derivadas', proficiency: 0.35, evidence: 0.6 }
 * ]
 *
 * @param {Object} graphConfig
 * Exemplo:
 * {
 *   prerequisites: {
 *     "Derivadas": ["Funções", "Limites"]
 *   }
 * }
 *
 * @param {Object} options
 */
export function computeTopicGraphMetrics(topics = [], graphConfig = {}, options = {}) {
  const safeTopics = Array.isArray(topics)
    ? topics
    : Object.values(topics || {});

  if (safeTopics.length === 0) {
    return {
      global: {
        nodeCount: 0,
        edgeCount: 0,
      },
      topics: [],
    };
  }

  const displayName = new Map();
  const proficiency = new Map();
  const evidence = new Map();

  safeTopics.forEach((topic, index) => {
    const norm = normalizeGraphName(topic?.name ?? `topic-${index}`);

    displayName.set(norm, String(topic?.name ?? norm));

    const rawProficiency = Number(topic?.proficiency);
    const rawPercentage = Number(topic?.percentage);

    let safeProficiency = 0.25;

    if (Number.isFinite(rawProficiency)) {
      safeProficiency = clampFinite(rawProficiency, 0, 1, 0.25);
    } else if (Number.isFinite(rawPercentage)) {
      safeProficiency = clampFinite(rawPercentage / 100, 0, 1, 0.25);
    }

    proficiency.set(norm, safeProficiency);

    const rawEvidence = Number(topic?.evidence);
    evidence.set(norm, Number.isFinite(rawEvidence) ? clampFinite(rawEvidence, 0, 1, 0) : 0);
  });

  const nodes = [...displayName.keys()];
  const nodeSet = new Set(nodes);

  const rawEdges = [];
  const prereqMap = new Map();

  nodes.forEach((node) => {
    prereqMap.set(node, []);
  });

  function addEdge(from, to, weight = 1) {
    const fromNorm = normalizeGraphName(from);
    const toNorm = normalizeGraphName(to);

    if (!fromNorm || !toNorm || fromNorm === toNorm) return;

    const safeWeight = Math.max(0.1, Number(weight) || 1);

    rawEdges.push({
      from: fromNorm,
      to: toNorm,
      weight: safeWeight,
    });

    if (nodeSet.has(toNorm)) {
      const current = prereqMap.get(toNorm) || [];
      if (!current.includes(fromNorm)) {
        current.push(fromNorm);
        prereqMap.set(toNorm, current);
      }
    }
  }

  // Formato 1: edges
  if (Array.isArray(graphConfig?.edges)) {
    graphConfig.edges.forEach((edge) => {
      addEdge(
        edge?.from ?? edge?.prerequisite,
        edge?.to ?? edge?.topic,
        edge?.weight
      );
    });
  }

  // Formato 2: prerequisites
  if (graphConfig?.prerequisites && typeof graphConfig.prerequisites === 'object') {
    Object.entries(graphConfig.prerequisites).forEach(([topic, prerequisites]) => {
      const list = Array.isArray(prerequisites)
        ? prerequisites
        : [prerequisites];

      list.forEach((prerequisite) => {
        addEdge(prerequisite, topic, 1);
      });
    });
  }

  const outgoing = new Map(nodes.map((node) => [node, []]));
  const incoming = new Map(nodes.map((node) => [node, []]));
  const outWeight = new Map(nodes.map((node) => [node, 0]));

  rawEdges.forEach((edge) => {
    if (!nodeSet.has(edge.from) || !nodeSet.has(edge.to)) return;

    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);

    outWeight.set(
      edge.from,
      (outWeight.get(edge.from) || 0) + edge.weight
    );
  });

  const damping = clampFinite(options.damping, 0, 1, 0.85);
  const iterations = Math.round(clampFinite(options.iterations, 5, 100, 35));

  let pageRank = new Map(nodes.map((node) => [node, 1 / nodes.length]));

  for (let i = 0; i < iterations; i++) {
    const next = new Map(
      nodes.map((node) => [node, (1 - damping) / nodes.length])
    );

    nodes.forEach((node) => {
      const inbound = incoming.get(node) || [];

      inbound.forEach((edge) => {
        const weightFrom = outWeight.get(edge.from) || 0;
        if (weightFrom <= 0) return;

        const contribution =
          (pageRank.get(edge.from) || 0) * (edge.weight / weightFrom);

        next.set(node, (next.get(node) || 0) + damping * contribution);
      });
    });

    const sum = [...next.values()].reduce((acc, val) => acc + val, 0) || 1;

    nodes.forEach((node) => {
      next.set(node, (next.get(node) || 0) / sum);
    });

    pageRank = next;
  }

  let maxPageRank = 1e-9;
  for (const pr of pageRank.values()) {
    if (pr > maxPageRank) maxPageRank = pr;
  }
  const readinessThreshold = clampFinite(options.readinessThreshold, 0, 1, 0.6);

  const topicMetrics = nodes.map((node) => {
    const prerequisites = prereqMap.get(node) || [];

    let prereqReadiness = 1;
    let prereqGap = 0;
    const blockedBy = [];

    if (prerequisites.length > 0) {
      const values = prerequisites.map((prereq) => {
        return proficiency.get(prereq) ?? 0.35;
      });

      const sum = values.reduce((acc, val) => acc + val, 0);
      prereqReadiness = sum / values.length;

      prereqGap = Math.max(0, readinessThreshold - prereqReadiness);

      prerequisites.forEach((prereq, idx) => {
        const prereqProficiency = values[idx] ?? 0.35;
        if (prereqProficiency < readinessThreshold) {
          blockedBy.push(displayName.get(prereq) || prereq);
        }
      });
    }

    const rawPageRank = pageRank.get(node) || 0;
    const normalizedPageRank = rawPageRank / maxPageRank;

    return {
      name: displayName.get(node) || node,
      normalizedKey: node,
      pageRank: Number(rawPageRank.toFixed(6)),
      normalizedPageRank: Number(normalizedPageRank.toFixed(6)),
      graphImportance: Number(normalizedPageRank.toFixed(6)),
      indegree: (incoming.get(node) || []).length,
      outdegree: (outgoing.get(node) || []).length,
      prerequisiteCount: prerequisites.length,
      prereqReadiness: Number(prereqReadiness.toFixed(4)),
      prereqGap: Number(prereqGap.toFixed(4)),
      blockedBy,
    };
  });

  return {
    global: {
      nodeCount: nodes.length,
      edgeCount: rawEdges.filter(
        (edge) => nodeSet.has(edge.from) && nodeSet.has(edge.to)
      ).length,
      damping,
      iterations,
    },
    topics: topicMetrics,
  };
}

export default {
  normalizeGraphName,
  getKnowledgeGraphForCategory,
  computeTopicGraphMetrics,
};


```
