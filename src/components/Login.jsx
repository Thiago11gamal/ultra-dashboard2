import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, signup } = useAuth();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                if (!name.trim()) throw new Error("Por favor, insira seu nome.");
                await signup(email, password, name);
            }
        } catch (err) {
            console.error(err);
            let msg = "Falha na autenticação.";
            if (err.code === 'auth/invalid-credential') msg = "E-mail ou senha incorretos.";
            if (err.code === 'auth/email-already-in-use') msg = "Este e-mail já está cadastrado.";
            if (err.code === 'auth/weak-password') msg = "A senha deve ter pelo menos 6 caracteres.";
            if (err.message) msg = err.message;
            setError(msg);
        }

        setLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] -z-20" />
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-transparent to-transparent -z-10" />

            {/* Glass Card */}
            <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-fade-in-down">
                {/* Decorative Elements */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-600/30 rounded-full blur-3xl pointer-events-none" />

                <div className="text-center mb-8 relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg transform rotate-3 hover:rotate-6 transition-transform">
                        <User className="text-white w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight mb-2">
                        {isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}
                    </h2>
                    <p className="text-slate-400 text-sm">
                        {isLogin ? 'Acesse sua área de estudos' : 'Comece sua jornada de aprovação'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-3 rounded-xl mb-6 flex items-start gap-3 text-sm animate-pulse">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                    {!isLogin && (
                        <div className="relative group">
                            <User className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Seu Nome"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className="relative group">
                        <Mail className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors w-5 h-5" />
                        <input
                            type="email"
                            placeholder="seu@email.com"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-purple-400 transition-colors w-5 h-5" />
                        <input
                            type="password"
                            placeholder="Sua senha secreta"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${isLogin
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-500/25'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                                {isLogin ? 'Entrar na Plataforma' : 'Criar Conta Grátis'}
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                        className="text-sm text-slate-400 hover:text-white transition-colors hover:underline"
                    >
                        {isLogin ? (
                            <>Novo por aqui? <span className="text-blue-400 font-bold">Crie uma conta</span></>
                        ) : (
                            <>Já tem conta? <span className="text-purple-400 font-bold">Fazer Login</span></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
