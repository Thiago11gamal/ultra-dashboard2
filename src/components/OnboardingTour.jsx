import React from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useAppStore } from '../store/useAppStore';

const steps = [
    {
        target: 'body',
        content: (
            <div className="text-left">
                <h2 className="text-lg font-bold text-indigo-400 mb-2">Bem-vindo ao Ultra Dashboard 🚀</h2>
                <p className="text-sm text-slate-300">Vamos fazer um tour rápido pelos recursos institucionais deste painel. Ele foi projetado para elevar o seu estudo ao máximo.</p>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '.tour-step-1', // Header
        content: (
            <div className="text-left">
                <h3 className="text-base font-bold text-purple-400 mb-1">Crie e troque de painéis</h3>
                <p className="text-xs text-slate-300">Você pode criar múltiplos painéis independentes (ex: um para cada concurso), e gerenciar sua nova <span className="text-white font-bold">Lixeira de 30 dias</span> aqui.</p>
            </div>
        ),
    },
    {
        target: '.tour-step-2', // Navigation tabs
        content: (
            <div className="text-left">
                <h3 className="text-base font-bold text-green-400 mb-1">Suas Ferramentas de Precisão</h3>
                <p className="text-xs text-slate-300">Navegue pelas abas para focar em Simulados, Retenção (Curva de Ebbinghaus) ou ver os Projetos do AI Coach.</p>
            </div>
        ),
    },
    {
        target: '.tour-step-3', // Pomodoro
        content: (
            <div className="text-left">
                <h3 className="text-base font-bold text-red-400 mb-1">Pomodoro Sincronizado</h3>
                <p className="text-xs text-slate-300">Use o cronômetro para medir o tempo exato das suas sessões. Os dados de XP e Histórico cruzam todas as plataformas.</p>
            </div>
        ),
    }
];

const TOUR_LOCALE = {
    back: 'Anterior',
    close: 'Fechar',
    last: 'Finalizar',
    next: 'Avançar',
    skip: 'Pular Tour'
};

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
            showSkipButton={true}
            showProgress={true}
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    arrowColor: '#1e293b',
                    backgroundColor: '#0f172a',
                    overlayColor: 'rgba(0, 0, 0, 0.7)',
                    primaryColor: '#6366f1',
                    textColor: '#f8fafc',
                    width: 380,
                    zIndex: 1000,
                },
                tooltipContainer: {
                    textAlign: 'left'
                },
                buttonNext: {
                    backgroundColor: '#4f46e5',
                },
                buttonBack: {
                    color: '#94a3b8',
                },
                buttonSkip: {
                    color: '#94a3b8',
                }
            }}
            locale={TOUR_LOCALE}
        />
    );
}
