import React, { useMemo, useState, useId } from 'react';
import { GitBranch, AlertOctagon } from 'lucide-react';
import { buildKnowledgeGraphLayout } from '../../../utils/advancedChartHelpers';

function nodeColorByProficiency(pct, isBlocked) {
  if (isBlocked) return { fill: '#4c0519', stroke: '#fb7185', text: '#fecdd3' };
  if (pct >= 75) return { fill: '#064e3b', stroke: '#34d399', text: '#d1fae5' };
  if (pct >= 55) return { fill: '#451a03', stroke: '#fbbf24', text: '#fef3c7' };
  return { fill: '#3b0764', stroke: '#c084fc', text: '#f3e8ff' };
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

  const [selectedCatId, setSelectedCatId] = useState(() => safeCategories[0]?.id || '');
  const [selectedNode, setSelectedNode] = useState(null);

  const activeCategory = useMemo(() => {
    return safeCategories.find((c) => c.id === selectedCatId) || safeCategories[0] || null;
  }, [safeCategories, selectedCatId]);

  const layout = useMemo(
    () => buildKnowledgeGraphLayout(activeCategory, { minScore, maxScore }),
    [activeCategory, minScore, maxScore]
  );

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
            value={activeCategory?.id || ''}
            onChange={(e) => {
              setSelectedCatId(e.target.value);
              setSelectedNode(null);
            }}
            className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 outline-none focus:border-indigo-400"
          >
            {safeCategories.map((c) => (
              <option key={c.id || c.name} value={c.id || c.name}>
                {c.name}
              </option>
            ))}
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
                const c1x = edge.from.x + dx * 0.45;
                const c2x = edge.to.x - dx * 0.45;
                const pathD = `M ${edge.from.x + 58} ${edge.from.y} C ${c1x} ${edge.from.y}, ${c2x} ${edge.to.y}, ${edge.to.x - 62} ${edge.to.y}`;
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
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer"
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
