import React, { useState } from 'react';
import { HelpCircle, X, ChevronDown, ChevronUp, Gauge, BarChart3, Target, Brain, Calendar, Clock, Zap, TrendingUp, Trophy, Flame } from 'lucide-react';

const helpSections = [
    {
        id: 'monte-carlo',
        icon: <Gauge size={20} className="text-blue-400" />,
        title: 'Monte Carlo',
        subtitle: 'Previsão de Aprovação',
        description: `O Monte Carlo é uma simulação estatística que calcula sua chance de atingir 90% de acertos na prova.`,
        howItWorks: [
            'Coleta suas notas de simulados por matéria',
            'Calcula a média e variação (SD) de cada matéria',
            'Aplica classificações configuráveis (ex: Português 20%, Matemática 25%)',
            'Roda 10.000 simulações de "provas virtuais"',
            'Conta quantas vezes você passou de 90%'
        ],
        example: `Se você tem média 75% com SD de 10:
• As simulações geram notas entre 55% e 95%
• Se 3.500 de 10.000 passaram de 90% → 35% de chance

IC 95% (Intervalo de Confiança): mostra o range onde 95% das suas notas cairiam.`,
        tips: [
            'SD baixo (< 5) = você é consistente ✅',
            'SD alto (> 10) = você oscila muito ⚠️',
            'Configure as classificações pelo botão ⚙️ conforme o edital'
        ]
    },
    {
        id: 'verified-stats',
        icon: <TrendingUp size={20} className="text-emerald-400" />,
        title: 'Estatísticas Verificadas',
        subtitle: 'Análise de Performance',
        description: `Mostra sua evolução real baseada nos simulados que você registra. Usa regressão linear para projetar quando você atingirá sua meta.`,
        howItWorks: [
            'Coleta todos os registros de simulados',
            'Calcula tendência de crescimento (slope)',
            'Projeta data de quando você atingirá 90%',
            'Mostra nível de confiança da previsão'
        ],
        example: `Suas notas: Jan (60%) → Fev (68%) → Mar (75%)
Crescimento: +7.5% por mês
Previsão: Você atinge 90% em Junho`,
        tips: [
            'Quanto mais simulados, mais precisa a previsão',
            'Faça simulados regulares para acompanhar evolução'
        ]
    },
    {
        id: 'pareto',
        icon: <Target size={20} className="text-red-400" />,
        title: 'Análise de Pareto',
        subtitle: 'Seus Maiores Inimigos',
        description: `Identifica os 20% dos tópicos que causam 80% dos seus erros. Focar nesses tópicos maximiza seu ganho de pontos.`,
        howItWorks: [
            'Lista todos os tópicos que você errou',
            'Ordena por quantidade de erros',
            'Destaca os top 5 maiores ofensores',
            'Calcula quantos pontos você recuperaria'
        ],
        example: `Top 3 Inimigos:
1. Concordância Verbal - 15 erros (-15 pts)
2. Proporcionalidade - 12 erros (-12 pts)
3. Cartografia - 10 erros (-10 pts)

Se você dominar esses 3, ganha +37 pontos!`,
        tips: [
            'Foque primeiro nos tópicos vermelhos',
            'Refaça questões desses assuntos'
        ]
    },
    {
        id: 'ai-coach',
        icon: <Brain size={20} className="text-purple-400" />,
        title: 'AI Coach',
        subtitle: 'Sugestões Personalizadas',
        description: `O coach analisa seus dados e sugere qual matéria você deveria estudar agora, baseado em urgência.`,
        howItWorks: [
            'Calcula "urgência" para cada matéria',
            'Considera: nota baixa + tempo sem estudar + oscilação',
            'Gera metas diárias específicas',
            'Prioriza o que dá mais resultado'
        ],
        example: `Urgência = (100 - Média) × 0.4 + Dias_Parado × 0.4 + SD × 0.2

Informática: (100-55) × 0.4 + 7 × 0.4 + 15 × 0.2 = 23.8 🔴
Português:   (100-80) × 0.4 + 2 × 0.4 + 5 × 0.2  = 9.8  🟢

→ Foque em Informática primeiro!`,
        tips: [
            'Clique em "Gerar Meta do Dia" para missões',
            'Siga as sugestões para otimizar estudos'
        ]
    },
    {
        id: 'heatmap',
        icon: <Calendar size={20} className="text-orange-400" />,
        title: 'Mapa de Atividade',
        subtitle: 'Calendário de Estudos',
        description: `Visualiza seus dias de estudo em um calendário. Quanto mais verde, mais você estudou naquele dia.`,
        howItWorks: [
            'Registra cada sessão de Pomodoro',
            'Soma minutos estudados por dia',
            'Colore o dia conforme intensidade',
            'Mostra padrões de consistência'
        ],
        example: `Cores do calendário:
⬜ Cinza = 0 minutos
🟩 Verde claro = 1-30 min
🟩 Verde médio = 30-60 min
🟩 Verde escuro = 60+ min`,
        tips: [
            'Tente manter todos os dias verdes',
            'Evite "buracos" no calendário'
        ]
    },
    {
        id: 'pomodoro',
        icon: <Clock size={20} className="text-red-400" />,
        title: 'Pomodoro Timer',
        subtitle: 'Técnica de Foco',
        description: `Divide o estudo em blocos de 25min (trabalho) + 5min (pausa). Isso melhora a concentração e retenção.`,
        howItWorks: [
            '25 minutos de foco total (sem distrações)',
            '5 minutos de pausa',
            'Após 4 ciclos, pausa longa de 15-30min',
            'Sistema de XP recompensa consistência'
        ],
        example: `1 Ciclo Completo:
🍅 Trabalho: 25min
☕ Pausa: 5min
🍅 Trabalho: 25min
☕ Pausa: 5min
🍅 Trabalho: 25min
☕ Pausa: 5min
🍅 Trabalho: 25min
🎉 Ciclo Completo! +300 XP`,
        tips: [
            'Desligue notificações durante trabalho',
            'Use a pausa para alongar e hidratar',
            'Quanto maior a prioridade da tarefa, mais ciclos'
        ]
    },
    {
        id: 'gamification',
        icon: <Zap size={20} className="text-yellow-400" />,
        title: 'Sistema de XP',
        subtitle: 'Gamificação',
        description: `Você ganha XP ao completar tarefas e Pomodoros. O XP abaixa seu nível (Level 10 → Level 1 = Master).`,
        howItWorks: [
            'Completar tarefa = +50 XP',
            'Completar ciclo Pomodoro = +300 XP',
            'Registrar simulado = +100 XP',
            'Bônus de Streak (dias seguidos)',
            'Chance de 10% de XP dobrado (Random Bonus)'
        ],
        example: `Níveis:
Level 10: Iniciante (0 XP)
Level 9: Novato (1000 XP)
...
Level 1: Mestre Aprovado (9000+ XP)`,
        tips: [
            'Mantenha o streak diário para bônus',
            'Complete conquistas para XP extra'
        ]
    },
    {
        id: 'streak',
        icon: <Flame size={20} className="text-orange-400" />,
        title: 'Streak',
        subtitle: 'Dias Consecutivos',
        description: `Conta quantos dias seguidos você estudou. Quebrar o streak zera a contagem.`,
        howItWorks: [
            'Estudar qualquer coisa = conta o dia',
            'Não estudar = streak zera',
            'Streak maior = bônus de XP maior'
        ],
        example: `Bônus por Streak:
1-2 dias: +0%
3-6 dias: +10% XP
7-13 dias: +25% XP
14-29 dias: +50% XP
30+ dias: +100% XP (dobro!)`,
        tips: [
            'Estude pelo menos 1 Pomodoro por dia',
            'Proteja seu streak nos finais de semana'
        ]
    },
    {
        id: 'rankings',
        icon: <Trophy size={20} className="text-amber-400" />,
        title: 'Rankings Pessoais',
        subtitle: 'Comparativo de Matérias',
        description: `Mostra suas matérias ordenadas por diferentes métricas: mais forte, mais fraca, mais volume.`,
        howItWorks: [
            'Saldo Líquido = Acertos - Erros',
            'Volume = Total de questões feitas',
            'Maior Inimigo = Matéria com mais erros'
        ],
        example: `Ranking por Saldo:
🥇 Português: +45 (85 acertos - 40 erros)
🥈 Geografia: +30 (60 acertos - 30 erros)
🥉 Raciocínio: +10 (50 acertos - 40 erros)
💀 Informática: -15 (35 acertos - 50 erros)`,
        tips: [
            'Matérias com saldo negativo precisam de atenção',
            'Volume alto + saldo baixo = muita prática, pouco resultado'
        ]
    }
];

export default function HelpGuide({ isOpen, onClose }) {
    const [expandedSection, setExpandedSection] = useState(null);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl animate-fade-in">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-xl">
                            <HelpCircle size={24} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Guia do Dashboard</h2>
                            <p className="text-xs text-slate-400">Explicação detalhada de cada painel</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(85vh-100px)] p-6 space-y-3 custom-scrollbar">
                    {helpSections.map((section) => (
                        <div
                            key={section.id}
                            className="border border-white/10 rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            {/* Section Header */}
                            <button
                                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                                className="w-full p-4 flex items-center justify-between text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-800 rounded-lg">
                                        {section.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{section.title}</h3>
                                        <p className="text-xs text-slate-400">{section.subtitle}</p>
                                    </div>
                                </div>
                                {expandedSection === section.id ? (
                                    <ChevronUp size={20} className="text-slate-400" />
                                ) : (
                                    <ChevronDown size={20} className="text-slate-400" />
                                )}
                            </button>

                            {/* Expanded Content */}
                            {expandedSection === section.id && (
                                <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
                                    {/* Description */}
                                    <p className="text-sm text-slate-300">{section.description}</p>

                                    {/* How it works */}
                                    <div>
                                        <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">Como Funciona</h4>
                                        <ol className="space-y-1">
                                            {section.howItWorks.map((step, idx) => (
                                                <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                                                    <span className="text-purple-400 font-bold">{idx + 1}.</span>
                                                    {step}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>

                                    {/* Example */}
                                    <div>
                                        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Exemplo Prático</h4>
                                        <pre className="text-xs text-slate-300 bg-slate-800/50 rounded-lg p-3 whitespace-pre-wrap font-mono overflow-x-auto">
                                            {section.example}
                                        </pre>
                                    </div>

                                    {/* Tips */}
                                    <div>
                                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Dicas</h4>
                                        <ul className="space-y-1">
                                            {section.tips.map((tip, idx) => (
                                                <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                                                    <span className="text-amber-400">💡</span>
                                                    {tip}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
