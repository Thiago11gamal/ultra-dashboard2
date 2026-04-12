import React, { useCallback } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useAppStore } from '../store/useAppStore';
import { Rocket, UserCircle, Compass, Timer, BarChart3, Target, CheckSquare, Trophy } from 'lucide-react';

const steps = [
    // ── Step 0: Welcome ──
    {
        target: 'body',
        content: (
            <div className="text-center py-5">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                    <Rocket className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-3 tracking-tight">
                    Bem-vindo ao Método Arraia
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-6 px-2">
                    Seu ecossistema inteligente de aprovação. Vamos fazer um tour rápido de 60 segundos para configurar sua base de estudos.
                </p>
                <div className="text-left bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-2">
                    <ul className="text-sm text-slate-300 space-y-3">
                        <li className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                            Planejamento Guiado por IA
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                            Revisões Espaçadas Automáticas
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                            Gamificação e Métricas de Alto Nível
                        </li>
                    </ul>
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
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl shadow-inner">
                        <UserCircle className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">Gestão de Conta</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Acesse seu perfil para criar <strong>Múltiplos Painéis</strong>. Estude para concursos diferentes sem misturar suas métricas. Gerencie backups e lixeira em um só lugar.
                </p>
            </div>
        ),
        placement: 'bottom',
    },

    // ── Step 2: Navigation ──
    {
        target: '.tour-step-2',
        content: (
            <div className="text-left">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl shadow-inner">
                        <Compass className="w-5 h-5 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">Navegação Estratégica</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Sua central de ferramentas. Acesse <strong>Simulados IA</strong>, <strong>Retenção</strong> e analise sua <strong>Evolução</strong> com projeções de aprovação precisas.
                </p>
            </div>
        ),
        placement: 'bottom-start',
    },

    // ── Step 3: Pomodoro ──
    {
        target: '.tour-step-3',
        content: (
            <div className="text-left">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl shadow-inner">
                        <Timer className="w-5 h-5 text-rose-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">Foco Sincronizado</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">
                    Cronometre sessões para gerar <strong>XP</strong> e alimentar seu mapa de constância. Sincronização em tempo real entre todos os seus dispositivos.
                </p>
            </div>
        ),
        placement: 'bottom',
    },

    // ── Step 4: Dashboard Stats ──
    {
        target: '.tour-step-4',
        content: (
            <div className="text-left">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl shadow-inner">
                        <BarChart3 className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">Visão Executiva</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Monitoramento contínuo dos seus KPIs: média de acertos, contagem regressiva da prova e o percentual exato de fechamento do edital.
                </p>
            </div>
        ),
        placement: 'bottom',
    },

    // ── Step 5: Next Goal ──
    {
        target: '.tour-step-5',
        content: (
            <div className="text-left">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                        <Target className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-indigo-300">Motor de Decisão (IA)</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Nossa IA analisa seu desempenho e prioridades para sugerir o tópico mais crítico agora. Confie no <strong>Próximo Foco Inteligente</strong> para guiar sua rotina e otimizar cada minuto de estudo.
                </p>
            </div>
        ),
        placement: 'top',
    },

    // ── Step 6: Checklist ──
    {
        target: '.tour-step-6',
        content: (
            <div className="text-left">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl shadow-inner">
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">Gestão de Tarefas</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Crie matérias, defina prioridades e marque subtópicos como concluídos. Seu progresso alimenta diretamente o nível da sua conta.
                </p>
            </div>
        ),
        placement: 'top',
    },

    // ── Step 7: Finale ──
    {
        target: 'body',
        content: (
            <div className="text-center py-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <Trophy className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-3 tracking-tight">
                    Tudo Pronto!
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-6 px-2">
                    O motor do Método Arraia está configurado. Inicie sua jornada de alta performance agora mesmo.
                </p>
                <div className="text-left bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                    <h4 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">Missão Inicial</h4>
                    <ul className="text-sm text-slate-300 space-y-4">
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs text-indigo-300 font-bold">1</span>
                            Adicione sua primeira Matéria
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs text-indigo-300 font-bold">2</span>
                            Configure a Data da Prova
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs text-indigo-300 font-bold">3</span>
                            Inicie um ciclo de Foco
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
    back: 'Anterior',
    close: 'Fechar',
    last: 'Acessar Painel',
    next: 'Próximo',
    skip: 'Pular',
};

// UI Ultra Premium para o Tooltip (Design SaaS Moderno)
const CustomTooltip = ({ index, step, backProps, primaryProps, skipProps, tooltipProps, isLastStep, size }) => (
    <div
        {...tooltipProps}
        className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),0_0_30px_rgba(99,102,241,0.08)] w-full font-sans overflow-hidden relative"
        style={{
            ...tooltipProps.style,
            maxWidth: '460px',
            padding: '0', // O padding interno vai separar o corpo do rodapé
            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1), opacity 0.3s ease',
        }}
    >
        {/* Efeito de brilho de fundo super sutil (Glow) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-12 bg-indigo-500/10 blur-[30px] rounded-full pointer-events-none" />

        {/* Conteúdo do Passo */}
        <div className="p-7 mb-2 relative z-10">
            {step.content}
        </div>

        {/* Rodapé: Controles e Paginação (Fundo com contraste) */}
        <div className="flex items-center justify-between px-7 py-4 bg-slate-800/40 border-t border-slate-700/50">
            {/* Pular / Voltar */}
            <div className="flex items-center min-w-[80px]">
                {index > 0 ? (
                    <button
                        {...backProps}
                        className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200 outline-none"
                    >
                        {TOUR_LOCALE.back}
                    </button>
                ) : (
                    <button
                        {...skipProps}
                        className="text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors duration-200 outline-none"
                    >
                        {TOUR_LOCALE.skip}
                    </button>
                )}
            </div>

            {/* Dots de Progresso (Minimalistas com Neon) */}
            <div className="flex items-center gap-2">
                {Array.from({ length: size }, (_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === index 
                                ? 'w-6 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' 
                                : i < index 
                                    ? 'w-1.5 bg-indigo-500/30' 
                                    : 'w-1.5 bg-slate-700'
                        }`}
                    />
                ))}
            </div>

            {/* Botão Próximo / Finalizar */}
            <div className="flex justify-end min-w-[80px]">
                <button
                    {...primaryProps}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 outline-none active:scale-95 ${
                        isLastStep 
                            ? 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_4px_15px_rgba(16,185,129,0.3)]' 
                            : 'bg-indigo-500 hover:bg-indigo-400 shadow-[0_4px_15px_rgba(99,102,241,0.3)]'
                    }`}
                >
                    {isLastStep ? TOUR_LOCALE.last : TOUR_LOCALE.next}
                </button>
            </div>
        </div>
    </div>
);

export default function OnboardingTour() {
    
    const hasSeenTour = useAppStore(state => state.appState.hasSeenTour);
    const setHasSeenTour = useAppStore(state => state.setHasSeenTour);

    const handleJoyrideCallback = useCallback((data) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setHasSeenTour(true);
        }
    }, [setHasSeenTour]);

    if (hasSeenTour) return null;

    return (
        <Joyride
            steps={steps}
            run={true}
            continuous={true}
            scrollToFirstStep={true}
            scrollOffset={100}
            showSkipButton={true}
            showProgress={false}
            disableScrollParentFix={true}
            callback={handleJoyrideCallback}
            tooltipComponent={CustomTooltip}
            floaterProps={{
                disableAnimation: false,
                styles: {
                    floater: {
                        transition: 'opacity 0.4s ease-in-out, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)',
                        willChange: 'transform, opacity',
                        WebkitFontSmoothing: 'antialiased',
                        backfaceVisibility: 'hidden',
                        transform: 'translateZ(0)' // Força aceleração de hardware contra blur
                    }
                }
            }}
            styles={{
                options: {
                    overlayColor: 'rgba(5, 8, 16, 0.85)', // Fundo super escuro e sofisticado
                    zIndex: 10000,
                },
                spotlight: {
                    borderRadius: '16px',
                    backgroundColor: 'transparent',
                    boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.2), 0 0 25px rgba(99, 102, 241, 0.1)',
                },
            }}
            locale={TOUR_LOCALE}
        />
    );
}
