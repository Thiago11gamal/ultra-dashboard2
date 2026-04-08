import React, { useCallback } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useAppStore } from '../store/useAppStore';
import { Rocket, UserCircle, Compass, Timer, BarChart3, Target, CheckSquare, Trophy } from 'lucide-react';

const steps = [
    // ── Step 0: Welcome ──
    {
        target: 'body',
        content: (
            <div className="text-center py-4">
                <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                    <Rocket className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-3 tracking-tight">
                    Bem-vindo ao Método Arraia
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-6 px-2">
                    Seu ecossistema inteligente de aprovação. Vamos fazer um tour rápido de 60 segundos para você extrair o máximo das nossas ferramentas.
                </p>
                <div className="text-left bg-slate-900/50 rounded-xl p-4 border border-slate-800 mb-2">
                    <ul className="text-sm text-slate-300 space-y-3">
                        <li className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                            Planejamento Guiado por IA
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                            Revisões Espaçadas (Ebbinghaus)
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
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
                    <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg">
                        <UserCircle className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Gestão de Conta</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Acesse seu perfil para criar <strong>Múltiplos Painéis</strong>. Estude para concursos diferentes sem misturar suas métricas. Aqui você também gerencia backups e acessa a lixeira de segurança.
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
                    <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg">
                        <Compass className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Navegação Principal</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Sua central de ferramentas de aprovação. Acesse rapidamente os <strong>Simulados IA</strong>, controle de <strong>Retenção</strong> e analise sua <strong>Evolução</strong> com projeções precisas.
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
                    <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg">
                        <Timer className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Foco Sincronizado</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">
                    Cronometre suas sessões. Cada ciclo de foco concluído gera <strong>Pontos de Experiência (XP)</strong> e alimenta automaticamente seu mapa de constância.
                </p>
                <div className="bg-slate-900 border border-slate-800 rounded p-2.5 text-xs text-slate-500">
                    Sincroniza em tempo real com seu celular.
                </div>
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
                    <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">O Raio-X do Edital</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Monitoramento em tempo real dos seus KPIs mais importantes: média de acertos geral, data e contagem regressiva da prova, e o percentual exato de fechamento do seu edital.
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
                    <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg">
                        <Target className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Motor de Decisão (IA)</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Não perca tempo montando cronogramas estáticos. O <strong>Próximo Foco Inteligente</strong> analisa seus pontos fracos e sugere exatamente qual tópico você deve estudar agora para maximizar sua nota.
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
                    <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg">
                        <CheckSquare className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Organização de Tarefas</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Crie suas matérias, defina prioridades (Alta, Média, Baixa) e marque as tarefas como concluídas para avançar seu progresso e subir de nível na plataforma.
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
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                    <Trophy className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-3 tracking-tight">
                    Tudo Pronto!
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    A inteligência do Método Arraia já está a postos. Agora é com você.
                </p>
                <div className="text-left bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Primeiros Passos</h4>
                    <ul className="text-sm text-slate-300 space-y-3">
                        <li className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-indigo-400 font-bold">1</span>
                            Adicione sua primeira Matéria
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-indigo-400 font-bold">2</span>
                            Configure a Data da Prova
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-indigo-400 font-bold">3</span>
                            Inicie um ciclo de Pomodoro
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
    last: 'Iniciar Estudos',
    next: 'Próximo',
    skip: 'Pular',
};

// UI Ultra Premium para o Tooltip
const CustomTooltip = ({ index, step, backProps, primaryProps, skipProps, tooltipProps, isLastStep, size }) => (
    <div
        {...tooltipProps}
        className="bg-[#0b1120] border border-slate-800 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),0_0_30px_rgba(99,102,241,0.05)] w-full font-sans"
        style={{
            ...tooltipProps.style,
            maxWidth: '440px',
            padding: '24px 28px',
            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease',
        }}
    >
        {/* Conteúdo do Passo */}
        <div className="mb-6">
            {step.content}
        </div>

        {/* Rodapé: Controles e Paginação */}
        <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-800/80">
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

            {/* Dots de Progresso (Minimalistas) */}
            <div className="flex items-center gap-1.5">
                {Array.from({ length: size }, (_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === index 
                                ? 'w-6 bg-indigo-500' 
                                : i < index 
                                    ? 'w-1.5 bg-slate-600' 
                                    : 'w-1.5 bg-slate-800'
                        }`}
                    />
                ))}
            </div>

            {/* Botão Próximo / Finalizar */}
            <div className="flex justify-end min-w-[80px]">
                <button
                    {...primaryProps}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 shadow-lg outline-none active:scale-95 ${
                        isLastStep 
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/20' 
                            : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 shadow-indigo-500/20'
                    }`}
                >
                    {isLastStep ? TOUR_LOCALE.last : TOUR_LOCALE.next}
                </button>
            </div>
        </div>
    </div>
);

export default function OnboardingTour() {
    
    // ======== TRAVA DE TESTE ATIVADA ========
    // Ao finalizar seus testes de design, apague as duas linhas abaixo:
    const hasSeenTour = false; 
    const handleJoyrideCallback = useCallback(() => {}, []);
    
    // E descomente as 3 linhas abaixo para voltar a usar o banco de dados oficial:
    /*
    const hasSeenTour = useAppStore(state => state.appState.hasSeenTour);
    const setHasSeenTour = useAppStore(state => state.setHasSeenTour);
    const handleJoyrideCallback = useCallback((data) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            if (setHasSeenTour) setHasSeenTour(true);
        }
    }, [setHasSeenTour]);
    */
    // =========================================

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
                        transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
                    }
                }
            }}
            styles={{
                options: {
                    overlayColor: 'rgba(5, 8, 16, 0.75)', // Fundo mais elegante e menos pesado
                    zIndex: 10000,
                },
                spotlight: {
                    borderRadius: '12px',
                    backgroundColor: 'transparent',
                },
            }}
            locale={TOUR_LOCALE}
        />
    );
}
