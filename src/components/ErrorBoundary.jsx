import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
        this.handleReset = this.handleReset.bind(this);
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);

        // Auto-recover from Vite chunk loading errors caused by new deployments
        if (
            error.message &&
            (error.message.includes('Failed to fetch dynamically imported module') ||
                error.message.includes('Importing a module script failed'))
        ) {
            const hasReloaded = sessionStorage.getItem('chunk_force_reload');
            if (!hasReloaded) {
                sessionStorage.setItem('chunk_force_reload', 'true');
                window.location.reload();
                return;
            }
        }

        this.setState({ errorInfo });
    }

    handleReset() {
        this.setState({ hasError: false, error: null, errorInfo: null });
    }

    render() {
        if (this.state.hasError) {
            // If a custom inline fallback was provided (for per-page use), render it.
            // Pass a reset function so the page can recover without a full reload.
            if (this.props.fallback) {
                return typeof this.props.fallback === 'function'
                    ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
                    : this.props.fallback;
            }

            // Default full-screen fallback (root boundary)
            return (
                <div suppressHydrationWarning={true} className="min-h-screen text-white p-8 flex flex-col items-center justify-center bg-slate-900">
                    <h1 className="text-3xl font-bold text-red-500 mb-4">Algo deu errado 😔</h1>
                    <div className="bg-slate-800 p-6 rounded-xl max-w-2xl w-full overflow-auto border border-red-500/30">
                        <p className="text-xl mb-4 font-mono text-red-300">
                            {this.state.error && this.state.error.toString()}
                        </p>
                        <pre className="text-sm text-slate-400 font-mono whitespace-pre-wrap">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                    <div className="flex gap-4 mt-8">
                        <button
                            onClick={this.handleReset}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition-colors"
                        >
                            Tentar Recuperar ↩️
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
                        >
                            Recarregar Página
                        </button>
                        <button
                            onClick={() => {
                                const backupKeys = [
                                    'ultra-dashboard-storage',
                                    'ultra-dashboard-data',
                                    'ultra-dashboard-v8',
                                    'ultra-dashboard-storage-v8',
                                    'ultra-dashboard-data-backup-safety'
                                ];
                                let foundData = {};
                                backupKeys.forEach(key => {
                                    const val = localStorage.getItem(key);
                                    if (val) foundData[key] = val;
                                });
                                if (Object.keys(foundData).length > 0) {
                                    navigator.clipboard.writeText(JSON.stringify(foundData, null, 2)).then(() =>
                                        alert('Dados copiados! Chaves: ' + Object.keys(foundData).join(', '))
                                    );
                                } else {
                                    alert('Nenhum dado encontrado.');
                                }
                            }}
                            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold transition-colors border border-white/10"
                        >
                            Copiar Dados de Backup
                        </button>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/10 w-full max-w-2xl text-center">
                        <p className="text-xs text-slate-500 mb-4">Se recarregar não funcionar, seus dados locais podem estar corrompidos.</p>
                        <button
                            onClick={() => {
                                if (window.confirm('ATENÇÃO: Isso apagará seus dados locais.\n\nContinuar?')) {
                                    [
                                        'ultra-dashboard-storage',
                                        'ultra-dashboard-data',
                                        'ultra-dashboard-v8',
                                        'ultra-dashboard-storage-v8',
                                        'ultra-dashboard-data-backup-safety'
                                    ].forEach(key => localStorage.removeItem(key));
                                    window.location.reload();
                                }
                            }}
                            className="text-red-500/50 hover:text-red-500 text-xs font-mono hover:underline transition-colors"
                        >
                            Resetar App de Fábrica (Último Recurso)
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * PageErrorBoundary — Lightweight per-page boundary.
 * A crash in uma página NÃO derruba sidebar/header.
 * Uso: envolva o JSX retornado de cada página com <PageErrorBoundary pageName="Dashboard">
 */
export function PageErrorBoundary({ children, pageName = 'esta página' }) {
    return (
        <ErrorBoundary
            fallback={({ error, reset }) => (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
                    <div className="text-5xl">⚠️</div>
                    <h2 className="text-xl font-bold text-red-400">Erro em {pageName}</h2>
                    <p className="text-slate-400 text-sm font-mono max-w-md">
                        {error?.message || 'Erro desconhecido'}
                    </p>
                    <div className="flex gap-3 mt-2">
                        <button
                            onClick={reset}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold transition-colors"
                        >
                            Tentar Novamente
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold transition-colors"
                        >
                            Recarregar
                        </button>
                    </div>
                </div>
            )}
        >
            {children}
        </ErrorBoundary>
    );
}

export default ErrorBoundary;
