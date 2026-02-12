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
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0f0c29]">
            {/* 🌌 Background Ambience */}
            <div className="absolute inset-0">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse-slower"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
            </div>

            {/* 🌟 Glass Card */}
            <div className="w-full max-w-md relative z-10 transition-all duration-500 hover:scale-[1.01]">
                <div className="aspect-[4/5] sm:aspect-auto sm:min-h-[500px] bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">

                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                    {/* Header */}
                    <div className="text-center mb-10 relative">
                        <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 ${isLogin ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30' : 'bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/30'} border border-white/20`}>
                            <User className="text-white w-10 h-10 drop-shadow-md" strokeWidth={1.5} />
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-2 drop-shadow-sm">
                            {isLogin ? 'Bem-vindo' : 'Criar Conta'}
                        </h2>
                        <p className="text-slate-400 font-medium">
                            {isLogin ? 'Faça login para continuar' : 'Comece sua jornada hoje'}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-2xl mb-6 flex items-center gap-3 text-sm animate-shake">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <div className="relative group/input">
                                <User className="absolute left-4 top-4 text-slate-500 group-focus-within/input:text-white transition-colors w-5 h-5 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Seu Nome"
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/5 transition-all font-medium"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={!isLogin}
                                />
                            </div>
                        )}

                        <div className="relative group/input">
                            <Mail className={`absolute left-4 top-4 text-slate-500 transition-colors w-5 h-5 pointer-events-none ${isLogin ? 'group-focus-within/input:text-blue-400' : 'group-focus-within/input:text-purple-400'}`} />
                            <input
                                type="email"
                                placeholder="seu@email.com"
                                className={`w-full bg-black/20 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:bg-white/5 transition-all font-medium ${isLogin ? 'focus:border-blue-500/50' : 'focus:border-purple-500/50'}`}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="relative group/input">
                            <Lock className={`absolute left-4 top-4 text-slate-500 transition-colors w-5 h-5 pointer-events-none ${isLogin ? 'group-focus-within/input:text-blue-400' : 'group-focus-within/input:text-purple-400'}`} />
                            <input
                                type="password"
                                placeholder="Sua senha"
                                className={`w-full bg-black/20 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:bg-white/5 transition-all font-medium ${isLogin ? 'focus:border-blue-500/50' : 'focus:border-purple-500/50'}`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed ${isLogin
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/40'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-purple-500/40'
                                }`}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Entrar Agora' : 'Começar Gratuitamente'}
                                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                        {isLogin ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                                    </div>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Switch */}
                    <div className="mt-8 text-center">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-sm font-medium text-slate-400 hover:text-white transition-colors group/link"
                        >
                            {isLogin ? (
                                <>Não tem conta? <span className="text-blue-400 group-hover/link:underline">Cadastre-se</span></>
                            ) : (
                                <>Já possui conta? <span className="text-purple-400 group-hover/link:underline">Faça Login</span></>
                            )}
                        </button>
                    </div>
                </div>

                {/* Bottom decorative line */}
                <div className={`absolute bottom-0 left-10 right-10 h-1 rounded-full blur-md ${isLogin ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
            </div>

            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.05); }
                }
                @keyframes pulse-slower {
                    0%, 100% { opacity: 0.3; transform: scale(1) translate(0,0); }
                    50% { opacity: 0.5; transform: scale(1.1) translate(-20px, 20px); }
                }
                .animate-pulse-slow { animation: pulse-slow 8s infinite ease-in-out; }
                .animate-pulse-slower { animation: pulse-slower 12s infinite ease-in-out; }
                .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
            `}</style>
        </div>
    );
}
