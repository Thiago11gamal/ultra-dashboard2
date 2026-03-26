import React, { useCallback } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useAppStore } from '../store/useAppStore';

const steps = [
    // ── Step 0: Welcome (centered) ──
    {
        target: 'body',
        content: (
            <div className="text-center py-2">
                <div className="text-4xl mb-3">🚀</div>
                <h2 className="text-xl font-black bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-3">
                    Bem-vindo ao Método Arraia
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                    Seu painel de estudos inteligente. Vou te mostrar
                    <span className="text-white font-semibold"> tudo o que você precisa</span> para
                    dominar o conteúdo do seu concurso.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                    Tour rápido · 60 segundos
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
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">👤</span>
                    <h3 className="text-base font-bold text-purple-400">Seu Perfil & Painéis</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                    Toque no seu <span className="text-white font-semibold">avatar</span> para acessar seus painéis.
                    Você pode criar <span className="text-purple-300 font-semibold">múltiplos concursos</span> independentes,
                    gerenciar backup/restauração e acessar a Lixeira de 30 dias.
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
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🧭</span>
                    <h3 className="text-base font-bold text-emerald-400">Navegação Rápida</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                    Todas as suas ferramentas estão aqui.
                    <span className="text-white font-semibold"> Simulados IA</span> para processar provas,
                    <span className="text-white font-semibold"> Retenção</span> com Curva de Ebbinghaus,
                    <span className="text-white font-semibold"> AI Coach</span> para planejamento semanal, e muito mais.
                </p>
            </div>
        ),
        placement: 'bottom',
    },

    // ── Step 3: Pomodoro ──
    {
        target: '.tour-step-3',
        content: (
            <div className="text-left">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">⏱️</span>
                    <h3 className="text-base font-bold text-red-400">Pomodoro Sincronizado</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                    Cronometre suas sessões de estudo com o <span className="text-white font-semibold">Pomodoro</span>.
                    Cada sessão concluída gera <span className="text-yellow-400 font-semibold">XP</span>, alimenta o
                    mapa de calor de atividade e sincroniza entre todos os seus dispositivos.
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
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📊</span>
                    <h3 className="text-base font-bold text-cyan-400">Visão Geral Instantânea</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                    Seus <span className="text-white font-semibold">KPIs principais</span> em um relance:
                    média geral, total de questões, data da prova com contagem regressiva, e seu progresso
                    por matéria. Tudo atualizado em tempo real.
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
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🎯</span>
                    <h3 className="text-base font-bold text-amber-400">Próximo Foco Inteligente</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                    O sistema analisa automaticamente suas matérias e sugere
                    <span className="text-white font-semibold"> exatamente o que estudar agora</span> — priorizando
                    as áreas com menor desempenho ou há mais tempo sem revisão.
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
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">✅</span>
                    <h3 className="text-base font-bold text-green-400">Matérias & Tarefas</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                    Organize seu estudo por <span className="text-white font-semibold">matérias</span> e
                    <span className="text-white font-semibold"> tarefas</span>. Marque como concluído para
                    ganhar <span className="text-yellow-400 font-semibold">XP</span> e subir de nível.
                    Use as prioridades (🔴🟡🟢) para nunca perder o foco.
                </p>
            </div>
        ),
        placement: 'top',
    },

    // ── Step 7: Finale ──
    {
        target: 'body',
        content: (
            <div className="text-center py-2">
                <div className="text-4xl mb-3">🎓</div>
                <h2 className="text-xl font-black bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-3">
                    Tudo Pronto!
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    Comece adicionando suas <span className="text-white font-semibold">matérias</span>,
                    defina a <span className="text-white font-semibold">data da prova</span>, e deixe
                    a inteligência do sistema trabalhar por você.
                </p>
                <div className="bg-white/5 rounded-lg px-4 py-2.5 border border-white/10">
                    <p className="text-xs text-slate-400">
                        💡 <span className="text-slate-300">Dica:</span> Importe um simulado no menu
                        <span className="text-purple-300 font-semibold"> Simulados IA</span> para ver a
                        mágica acontecer!
                    </p>
                </div>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
];

const TOUR_LOCALE = {
    back: '← Voltar',
    close: 'Fechar',
    last: '🎉 Começar!',
    next: 'Avançar →',
    skip: 'Pular Tour',
};

// Custom tooltip component for premium feel
const CustomTooltip = ({ continuous, index, step, backProps, closeProps, primaryProps, skipProps, tooltipProps, isLastStep, size }) => (
    <div
        {...tooltipProps}
        style={{
            ...tooltipProps.style,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6), 0 0 40px rgba(139, 92, 246, 0.15)',
            padding: '20px 24px',
            maxWidth: '400px',
            color: '#f8fafc',
        }}
    >
        {/* Content */}
        <div style={{ marginBottom: '16px' }}>
            {step.content}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
            {Array.from({ length: size }, (_, i) => (
                <div
                    key={i}
                    style={{
                        width: i === index ? '14px' : '6px',
                        height: '6px',
                        borderRadius: '999px',
                        background: i === index
                            ? 'linear-gradient(90deg, #a78bfa, #818cf8)'
                            : i < index
                                ? 'rgba(139, 92, 246, 0.5)'
                                : 'rgba(255,255,255,0.15)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                />
            ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            {index > 0 ? (
                <button
                    {...backProps}
                    style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94a3b8',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
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
                        padding: '8px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    {TOUR_LOCALE.skip}
                </button>
            )}

            <button
                {...primaryProps}
                style={{
                    background: isLastStep
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    border: 'none',
                    color: '#fff',
                    padding: '9px 22px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: isLastStep
                        ? '0 4px 15px rgba(16, 185, 129, 0.3)'
                        : '0 4px 15px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.2s',
                    letterSpacing: '0.3px',
                }}
            >
                {isLastStep ? TOUR_LOCALE.last : TOUR_LOCALE.next}
            </button>
        </div>
    </div>
);

export default function OnboardingTour() {
    const hasSeenTour = useAppStore(state => state.appState.hasSeenTour);
    const setHasSeenTour = useAppStore(state => state.setHasSeenTour);

    const handleJoyrideCallback = useCallback((data) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            if (setHasSeenTour) {
                setHasSeenTour(true);
            }
        }
    }, [setHasSeenTour]);

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
                        color: '#1e1b4b',
                    },
                },
                disableAnimation: false,
            }}
            styles={{
                options: {
                    arrowColor: '#1e1b4b',
                    overlayColor: 'rgba(0, 0, 0, 0.88)',
                    zIndex: 10000,
                },
                spotlight: {
                    borderRadius: '16px',
                    boxShadow: '0 0 0 4px rgba(139, 92, 246, 0.3), 0 0 15px rgba(139, 92, 246, 0.15)',
                },
                overlay: {
                    mixBlendMode: 'hard-light',
                },
            }}
            locale={TOUR_LOCALE}
        />
    );
}
