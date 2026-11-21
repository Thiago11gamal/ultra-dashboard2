import React, { useMemo, useState, useId } from 'react';
import { GitBranch, AlertOctagon } from 'lucide-react';
import { buildKnowledgeGraphLayout } from '../../../utils/advancedChartHelpers';

function nodeColorByProficiency(pct, isBlocked) {
  if (isBlocked) return { fill: '#4c0519', stroke: '#fb7185', text: '#fecdd3' };
  if (pct >= 75) return { fill: '#064e3b', stroke: '#34d399', text: '#d1fae5' };
  if (pct >= 55) return { fill: '#451a03', stroke: '#fbbf24', text: '#fef3c7' };
  return { fill: '#3b0764', stroke: '#c084fc', text: '#f3e8ff' };
}

function getCategorySelectKey(cat) {
  if (!cat || typeof cat !== 'object') return '';
  if (cat.id !== undefined && cat.id !== null && String(cat.id).trim() !== '') {
    return String(cat.id);
  }
  return String(cat.name || '');
}

export const KnowledgeGraphChart = React.memo(function KnowledgeGraphChart({
  categories = [],
  minScore = 0,
  maxScore = 100,
}) {
  const uid = useId().replace(/:/g, '');
  const safeCategories = useMemo(
    () => (Array.isArray(categories) ? categories : Object.values(categories || {})).filter(Boolean),
    [categories]
  );

  const [selectedCatId, setSelectedCatId] = useState(() => getCategorySelectKey(safeCategories[0]));
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);

  const activeCategory = useMemo(() => {
    const target = String(selectedCatId || '');
    return safeCategories.find((c) => getCategorySelectKey(c) === target) || safeCategories[0] || null;
  }, [safeCategories, selectedCatId]);

  const layout = useMemo(
    () => buildKnowledgeGraphLayout(activeCategory, { minScore, maxScore }),
    [activeCategory, minScore, maxScore]
  );

  // Deriva selectedNode a partir do layout atual: nunca exibe nó obsoleto ao trocar de disciplina/concurso
  const selectedNode = useMemo(() => {
    if (!selectedNodeKey) return null;
    return layout.nodes.find((n) => n.normalizedKey === selectedNodeKey) || null;
  }, [layout.nodes, selectedNodeKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <GitBranch size={15} className="text-indigo-400" />
          <span>
            {layout.stats.nodeCount} tópicos • {layout.stats.edgeCount} dependências
            {layout.stats.blockedCount > 0 && (
              <span className="text-rose-400 font-bold ml-1.5">
                • {layout.stats.blockedCount} bloqueado(s)
              </span>
            )}
          </span>
        </div>

        {safeCategories.length > 0 && (
          <select
            aria-label="Selecionar disciplina para o Grafo de Pré-Requisitos"
            value={getCategorySelectKey(activeCategory)}
            onChange={(e) => {
              setSelectedCatId(e.target.value);
              setSelectedNodeKey(null);
            }}
            className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 outline-none focus:border-indigo-400"
          >
            {safeCategories.map((c, idx) => {
              const key = getCategorySelectKey(c) || `cat-${idx}`;
              return (
                <option key={key} value={key}>
                  {c.name}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {layout.nodes.length === 0 ? (
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 text-center text-xs text-slate-400">
          Adicione tópicos ou simulados com assuntos na disciplina para visualizar o grafo de pré-requisitos e PageRank.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-950/70 p-3">
            <svg
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              className="w-full min-w-[540px] h-auto"
              role="img"
              aria-label="Grafo interativo de pré-requisitos de tópicos"
            >
              <defs>
                <marker id={`arrowOk_${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                </marker>
                <marker id={`arrowBlock_${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#fb7185" />
                </marker>
              </defs>

              {/* Arestas direcionadas */}
              {layout.edges.map((edge) => {
                const dx = edge.to.x - edge.from.x;
                const dy = edge.to.y - edge.from.y;
                let pathD;
                if (Math.abs(dx) < 10) {
                  // Mesmo eixo X: arco vertical lateral sem atravessar os retângulos dos nós
                  const startY = dy >= 0 ? edge.from.y + 22 : edge.from.y - 22;
                  const endY = dy >= 0 ? edge.to.y - 24 : edge.to.y + 24;
                  const bendX = edge.from.x + 76;
                  pathD = `M ${edge.from.x + 20} ${startY} C ${bendX} ${startY}, ${bendX} ${endY}, ${edge.to.x + 20} ${endY}`;
                } else if (dx < 0) {
                  // Aresta reversa (ex.: ciclo ou feedback): arco superior fora dos nós
                  const arcY = Math.min(edge.from.y, edge.to.y) - 42;
                  pathD = `M ${edge.from.x - 58} ${edge.from.y} C ${edge.from.x - 90} ${arcY}, ${edge.to.x + 90} ${arcY}, ${edge.to.x + 62} ${edge.to.y}`;
                } else {
                  const c1x = edge.from.x + dx * 0.45;
                  const c2x = edge.to.x - dx * 0.45;
                  pathD = `M ${edge.from.x + 58} ${edge.from.y} C ${c1x} ${edge.from.y}, ${c2x} ${edge.to.y}, ${edge.to.x - 62} ${edge.to.y}`;
                }
                return (
                  <path
                    key={edge.id}
                    d={pathD}
                    fill="none"
                    stroke={edge.isBlocking ? '#fb7185' : '#475569'}
                    strokeWidth={edge.isBlocking ? 2 : 1.4}
                    strokeDasharray={edge.isBlocking ? '4 3' : undefined}
                    strokeOpacity={edge.isBlocking ? 0.9 : 0.65}
                    markerEnd={edge.isBlocking ? `url(#arrowBlock_${uid})` : `url(#arrowOk_${uid})`}
                  />
                );
              })}

              {/* Nós (tópicos) */}
              {layout.nodes.map((node) => {
                const palette = nodeColorByProficiency(node.proficiencyPct, node.isBlocked);
                const isSelected = selectedNode?.normalizedKey === node.normalizedKey;
                const shortName = node.name.length > 16 ? `${node.name.slice(0, 15)}…` : node.name;
                return (
                  <g
                    key={node.normalizedKey}
                    transform={`translate(${node.x}, ${node.y})`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${node.name}: proficiência ${node.proficiencyPct}%, PageRank ${Math.round(node.graphImportance * 100)}${node.isBlocked ? ', bloqueado por pré-requisito' : ''}`}
                    onClick={() => setSelectedNodeKey(node.normalizedKey)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedNodeKey(node.normalizedKey);
                      }
                    }}
                    className="cursor-pointer outline-none focus-visible:opacity-95"
                  >
                    <rect
                      x={-60}
                      y={-22}
                      width={120}
                      height={44}
                      rx={10}
                      fill={palette.fill}
                      stroke={isSelected ? '#ffffff' : palette.stroke}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <text
                      x={0}
                      y={-4}
                      textAnchor="middle"
                      fill={palette.text}
                      fontSize={10}
                      fontWeight={700}
                    >
                      {shortName}
                    </text>
                    <text
                      x={0}
                      y={12}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize={9}
                      fontFamily="monospace"
                    >
                      {node.proficiencyPct}% • PR {Math.round(node.graphImportance * 100)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/80" />Dominado (≥75%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400/80" />Em evolução (55–74%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-purple-400/80" />Crítico (&lt;55%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400/80" />Bloqueado por pré-requisito</span>
            </div>
            {layout.isAutoTopology && (
              <span className="text-[10px] text-slate-500">Topologia sequencial inferida da ordem dos tópicos</span>
            )}
          </div>

          {selectedNode && (
            <div className="rounded-xl border border-indigo-500/30 bg-slate-900/70 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-white">{selectedNode.name}</p>
                <span className="font-mono text-indigo-300">
                  Importância (PageRank): {Math.round(selectedNode.graphImportance * 100)}/100
                </span>
              </div>
              <p className="text-slate-400">
                Proficiência: <strong className="text-white">{selectedNode.proficiencyPct}%</strong> · Prontidão de pré-requisitos:{' '}
                <strong className="text-white">{Math.round(selectedNode.prereqReadiness * 100)}%</strong>
              </p>
              {selectedNode.blockedBy?.length > 0 && (
                <p className="text-rose-300 flex items-center gap-1.5">
                  <AlertOctagon size={13} />
                  Bloqueado por: <strong>{selectedNode.blockedBy.join(', ')}</strong>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default KnowledgeGraphChart;
