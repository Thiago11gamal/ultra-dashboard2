import React, { useCallback } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useAppStore } from '../store/useAppStore';

const steps = [
    // ── Step 0: Welcome (centered) ──
    {
        target: 'body',
        content: (
            <div className="text-center py-2">
                <div className="text-5xl mb-4">🚀</div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                    Bem-vindo ao Método Arraia
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                    Muito mais que um painel de estudos, este é o seu <strong>ecossistema inteligente de aprovação</strong>. 
                    Nossa IA e algoritmos avançados vão guiar sua jornada até a posse.
                </p>
                <div className="text-left bg-white/5 rounded-lg p-3 border border-white/10 mb-4">
                    <p className="text-xs text-slate-300 font-semibold mb-2">O que você vai encontrar aqui:</p>
                    <ul className="text-xs text-slate-400 space-y-1.5 pl-4 list-disc marker:text-purple-500">
                        <li>Planejamento inteligente com base no seu desempenho.</li>
                        <li>Controle de revisões com a Curva de Ebbinghaus.</li>
                        <li>Gamificação (XP e Níveis) para manter sua disciplina.</li>
                    </ul>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium mt-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    Tour detalhado · 2 minutos
                </div>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },

    // ── Step 1: Profile / Panels ──
    {
        target: '.tour-step-1',
        content: (
            <div className="text-left">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(168,85,247,0.3)]">👤</div>
                    <h3 className="text-base font-bold text-purple-400">Seu Perfil & Múltiplos Concursos</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    Ao clicar no seu avatar, você acessa a central de controle da sua conta. O grande diferencial aqui é a <strong>Criação de Painéis</strong>:
                </p>
                <ul className="text-xs text-slate-400 space-y-2 pl-2 border-l-2 border-purple-500/30">
                    <li className="pl-2">🎯 <strong>Múltiplos Focos:</strong> Estuda para dois concursos? Crie um painel isolado para cada um, sem misturar métricas.</li>
                    <li className="pl-2">☁️ <strong>Segurança:</strong> Exporte ou importe backups manuais a qualquer momento.</li>
                    <li className="pl-2">🗑️ <strong>Lixeira Segura:</strong> Excluiu uma matéria sem querer? Recupere-a na lixeira em até 30 dias.</li>
                </ul>
            </div>
        ),
        placement: 'bottom',
    },

    // ── Step 2: Navigation ──
    {
        target: '.tour-step-2',
        content: (
            <div className="text-left">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(16,185,129,0.3)]">🧭</div>
                    <h3 className="text-base font-bold text-emerald-400">Navegação & Ferramentas Essenciais</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    O menu lateral é o coração da plataforma. Nele você navega entre as principais armas para a sua aprovação:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                        <strong className="text-emerald-300">🤖 Simulados IA</strong>
                        <p className="text-[10px] text-slate-400 mt-1">Cole suas questões e a IA extrai e analisa seus erros.</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                        <strong className="text-blue-300">🧠 Retenção</strong>
                        <p className="text-[10px] text-slate-400 mt-1">Revisões espaçadas no momento exato de esquecimento.</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                        <strong className="text-orange-300">📈 Evolução</strong>
                        <p className="text-[10px] text-slate-400 mt-1">Projeções de Monte Carlo para sua nota de corte.</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                        <strong className="text-indigo-300">📝 Anotações</strong>
                        <p className="text-[10px] text-slate-400 mt-1">Caderno de erros rápido e integrado aos tópicos.</p>
                    </div>
                </div>
            </div>
        ),
        placement: 'bottom-start',
    },

    // ── Step 3: Pomodoro ──
    {
        target: '.tour-step-3',
        content: (
            <div className="text-left">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(239,68,68,0.3)]">⏱️</div>
                    <h3 className="text-base font-bold text-red-400">Pomodoro Sincronizado e Gamificado</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-2">
                    Nós transformamos o ato de estudar em um jogo viciante. Não é apenas um cronômetro:
                </p>
                <ul className="text-xs text-slate-400 space-y-1.5 pl-4 list-disc marker:text-red-400">
                    <li><strong>Ganhe XP:</strong> Cada ciclo concluído (foco de 25, 50 ou 90 min) gera pontos de experiência para o seu Perfil.</li>
                    <li><strong>Suba de Nível:</strong> Acumule horas líquidas e destrave novas conquistas.</li>
                    <li><strong>Mapa de Calor:</strong> Cada sessão alimenta automaticamente seu gráfico de constância diária.</li>
                </ul>
                <p className="text-[11px] text-slate-500 mt-2 italic">Dica: Inicie o timer no PC e acompanhe a pausa pelo celular. É 100% sincronizado!</p>
            </div>
        ),
        placement: 'bottom',
    },

    // ── Step 4: Dashboard Stats ──
    {
        target: '.tour-step-4',
        content: (
            <div className="text-left">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(6,182,212,0.3)]">📊</div>
                    <h3 className="text-base font-bold text-cyan-400">Dashboard: O Raio-X da Aprovação</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-2">
                    Nesta área principal, a plataforma condensa milhares de dados dos seus estudos em visões simples:
                </p>
                <div className="space-y-2 mt-3">
                    <div className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">🔹</span>
                        <p className="text-xs text-slate-300"><strong className="text-white">Média Geral:</strong> Calculada cruzando sua performance em simulados recentes e exercícios pontuais.</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">🔹</span>
                        <p className="text-xs text-slate-300"><strong className="text-white">Contagem Regressiva:</strong> Configure o dia da sua prova. O algoritmo usará essa data para recalcular a agressividade das suas revisões.</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">🔹</span>
                        <p className="text-xs text-slate-300"><strong className="text-white">Conclusão do Edital:</strong> Veja visualmente quanto da matéria ainda falta estudar pela primeira vez.</p>
                    </div>
                </div>
            </div>
        ),
        placement: 'bottom',
    },

    // ── Step 5: Next Goal ──
    {
        target: '.tour-step-5',
        content: (
            <div className="text-left">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(245,158,11,0.3)]">🎯</div>
                    <h3 className="text-base font-bold text-amber-400">AI Coach: O Fim do "O que eu estudo hoje?"</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-2">
                    Nunca mais perca tempo montando cronogramas estáticos. O <strong className="text-white">Próximo Foco Inteligente</strong> varre seus dados e diz exatamente o que fazer agora.
                </p>
                <div className="bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/20 mt-2">
                    <p className="text-xs text-amber-200/80 mb-1 font-semibold">Como ele escolhe?</p>
                    <p className="text-[11px] text-amber-100/60">
                        O algoritmo prioriza matérias que estão com <span className="text-red-400 font-bold">desempenho crítico</span>, tarefas urgentes atrasadas, ou tópicos que não são revisados há mais tempo. Confie na IA para guiar sua rotina.
                    </p>
                </div>
            </div>
        ),
        placement: 'top',
    },

    // ── Step 6: Checklist ──
    {
        target: '.tour-step-6',
        content: (
            <div className="text-left">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(236,72,153,0.3)]">✅</div>
                    <h3 className="text-base font-bold text-pink-400">Gestão de Matérias & Tarefas</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    O centro de operações do seu dia a dia. Aqui você constrói o seu edital e gerencia o que precisa ser feito:
                </p>
                <ul className="text-xs text-slate-400 space-y-2 pl-2 border-l-2 border-pink-500/30">
                    <li className="pl-2">📚 <strong>Matérias e Subtópicos:</strong> Adicione Direito Constitucional e, dentro dela, "Direitos Fundamentais". Registre exercícios e acertos por subtópico.</li>
                    <li className="pl-2">🚦 <strong>Prioridades:</strong> Classifique as tarefas em 🔴 Alta (cai muito), 🟡 Média ou 🟢 Baixa.</li>
                    <li className="pl-2">⚔️ <strong>Check de Conclusão:</strong> Marcar tarefas como concluídas é a maneira mais rápida de acumular <strong className="text-yellow-400">XP</strong>.</li>
                </ul>
            </div>
        ),
        placement: 'top',
    },

    // ── Step 7: Finale ──
    {
        target: 'body',
        content: (
            <div className="text-center py-4">
                <div className="text-5xl mb-4 relative">
                    🏆
                    <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full z-[-1] animate-pulse"></div>
                </div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                    Você está pronto!
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed mb-5">
                    O Método Arraia já está preparado para alavancar seu rendimento. Seu próximo passo é alimentar o sistema.
                </p>
                
                <div className="text-left bg-white/5 rounded-lg p-4 border border-white/10 w-full mb-2">
                    <h4 className="text-xs font-bold text-white mb-2 uppercase tracking-wider">Missão Inicial:</h4>
                    <ul className="text-sm text-slate-300 space-y-2">
                        <li className="flex items-center gap-2">
                            <span className="text-emerald-400">1.</span> Adicione sua primeira <strong>Matéria</strong>.
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-emerald-400">2.</span> Ajuste a <strong>Data da Prova</strong> nas Configurações.
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-emerald-400">3.</span> Ligue o <strong>Pomodoro</strong> e faça 25 min de foco.
                        </li>
                    </ul>
                </div>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
];

const TOUR_LOCALE = {
    back: '← Anterior',
    close: 'Fechar',
    last: '🔥 Iniciar os Estudos!',
    next: 'Próximo →',
    skip: 'Pular',
};

// Custom tooltip component for premium feel
const CustomTooltip = ({ continuous, index, step, backProps, closeProps, primaryProps, skipProps, tooltipProps, isLastStep, size }) => (
    <div
        {...tooltipProps}
        style={{
            ...tooltipProps.style,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 40px rgba(139, 92, 246, 0.25)',
            padding: '28px 32px',
            maxWidth: '480px', /* Aumentado para acomodar o texto detalhado confortavelmente */
            color: '#f8fafc',
            transform: 'scale(1.02) translateY(-10px)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
    >
        <div className="absolute -inset-[1px] rounded-[25px] bg-gradient-to-br from-purple-500/30 via-transparent to-cyan-500/30 pointer-events-none" />
        
        {/* Content */}
        <div style={{ marginBottom: '20px' }}>
            {step.content}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            {Array.from({ length: size }, (_, i) => (
                <div
                    key={i}
                    style={{
                        width: i === index ? '20px' : '8px',
                        height: '8px',
                        borderRadius: '999px',
                        background: i === index
                            ? 'linear-gradient(90deg, #a78bfa, #2dd4bf)'
                            : i < index
                                ? 'rgba(139, 92, 246, 0.6)'
                                : 'rgba(255,255,255,0.1)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                />
            ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            {index > 0 ? (
                <button
                    {...backProps}
                    style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#cbd5e1',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                >
                    {TOUR_LOCALE.back}
                </button>
            ) : (
                <button
                    {...skipProps}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        padding: '10px 14px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => e.target.style.color = '#94a3b8'}
                    onMouseOut={(e) => e.target.style.color = '#64748b'}
                >
                    {TOUR_LOCALE.skip}
                </button>
            )}

            <button
                {...primaryProps}
                style={{
                    background: isLastStep
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                    border: 'none',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: isLastStep
                        ? '0 4px 20px rgba(16, 185, 129, 0.4)'
                        : '0 4px 20px rgba(139, 92, 246, 0.4)',
                    transition: 'all 0.2s transform, 0.2s box-shadow',
                    letterSpacing: '0.5px',
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
                {isLastStep ? TOUR_LOCALE.last : TOUR_LOCALE.next}
            </button>
        </div>
    </div>
);

export default function OnboardingTour() {
    // 1. COMENTE A BUSCA DO ESTADO GLOBAL
    // const hasSeenTour = useAppStore(state => state.appState.hasSeenTour);
    // const setHasSeenTour = useAppStore(state => state.setHasSeenTour);

    // 2. FORCE A VARIÁVEL PARA FALSO (O tutorial sempre vai abrir)
    const hasSeenTour = false;

    // 3. DESATIVE O CALLBACK TEMPORARIAMENTE
    const handleJoyrideCallback = useCallback((data) => {
        // Deixe vazio para a sincronização não interferir enquanto você testa o design!
        /* 
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            if (setHasSeenTour) {
                setHasSeenTour(true);
            }
        }
        */
    }, []);

    if (hasSeenTour) return null;

    return (
        <Joyride
            steps={steps}
            run={true}
            continuous={true}
            scrollToFirstStep={true}
            scrollOffset={80}
            showSkipButton={true}
            showProgress={false}
            disableScrollParentFix={true}
            callback={handleJoyrideCallback}
            tooltipComponent={CustomTooltip}
            floaterProps={{
                styles: {
                    arrow: {
                        color: '#0f172a',
                    },
                },
                disableAnimation: false,
            }}
            styles={{
                options: {
                    arrowColor: '#0f172a',
                    overlayColor: 'rgba(0, 0, 0, 0.88)',
                    zIndex: 10000,
                },
                spotlight: {
                    borderRadius: '16px',
                    boxShadow: '0 0 0 4px rgba(139, 92, 246, 0.4), 0 0 25px rgba(139, 92, 246, 0.3)',
                },
                overlay: {
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                },
            }}
            locale={TOUR_LOCALE}
        />
    );
}
