import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen text-white p-8 flex flex-col items-center justify-center bg-slate-900">
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
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
                        >
                            Tentar Recarregar Página
                        </button>
                        <button
                            onClick={() => {
                                // Safe Backup before nuclear option? 
                                // Ideally we don't offer nuclear option easily.
                                // But if the data is TRULY corrupted, they might be stuck loop.
                                // Let's rename it to "Modo de Segurança" or just hide it.
                                // User said "Cannot disappear in any way".
                                // So I will remove the option to clear data here.
                                // If they need to clear, they can use devtools or I can provide a hidden way later.
                                // For now: REMOVE IT.
                                window.location.reload();
                            }}
                            className="hidden"
                        >
                            Apagar Tudo
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
