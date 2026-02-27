import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    forceHardReload = () => {
        const url = new URL(window.location.href);
        url.searchParams.set("v", Date.now().toString());
        window.location.replace(url.toString());
    };

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);

        // Auto-recover from Vite chunk loading errors caused by new deployments
        if (
            error.message &&
            (error.message.includes('Failed to fetch dynamically imported module') ||
                error.message.includes('Importing a module script failed'))
        ) {
            // Prevent infinite reload loops 
            const hasReloaded = sessionStorage.getItem('chunk_force_reload');
            if (!hasReloaded) {
                sessionStorage.setItem('chunk_force_reload', 'true');
                this.forceHardReload();
                return;
            }
        }

        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
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
                            onClick={this.forceHardReload}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
                        >
                            Tentar Recarregar Página
                        </button>
                        <button
                            onClick={() => {
                                const data = localStorage.getItem('ultra-dashboard-storage');
                                if (data) {
                                    navigator.clipboard.writeText(data).then(() => alert('Dados copiados para a área de transferência! Salve em um arquivo de texto.'));
                                } else {
                                    alert('Nenhum dado encontrado para copiar.');
                                }
                            }}
                            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold transition-colors border border-white/10"
                        >
                            Copiar Dados de Backup
                        </button>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/10 w-full max-w-2xl text-center">
                        <p className="text-xs text-slate-500 mb-4">Se recarregar não funcionar, pode ser cache de versão antiga do app (chunk desatualizado).</p>
                        <button
                            onClick={() => {
                                if (window.confirm('ATENÇÃO: Isso apagará seus dados locais para recuperar o app. Certifique-se de ter copiado o backup acima se possível.\n\nContinuar?')) {
                                    localStorage.removeItem('ultra-dashboard-storage');
                                    this.forceHardReload();
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

export default ErrorBoundary;
