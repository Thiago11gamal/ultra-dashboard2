import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import './Login.css';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login, signup } = useAuth();
    // const canvasRef = useRef(null);

    // Starfield Animation


    const handleRipple = (e) => {
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const r = document.createElement('span');
        r.className = 'ripple';
        r.style.width = r.style.height = `${btn.offsetWidth}px`;
        r.style.left = `${e.clientX - rect.left - btn.offsetWidth / 2}px`;
        r.style.top = `${e.clientY - rect.top - btn.offsetWidth / 2}px`;
        btn.appendChild(r);
        setTimeout(() => r.remove(), 600);
    };

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
        } finally {
            setLoading(false);
        }
    }

    return (
        <div suppressHydrationWarning={true} style={{
            fontFamily: "'Segoe UI', sans-serif",
            background: "radial-gradient(circle at 20% 20%,#1e3a8a,#0b1120 60%)",
            color: "#fff",
            overflow: "hidden",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative"
        }}>


            {/* <canvas ref={canvasRef} /> */}

            <div className="container">
                <div className="left">
                    {/* Manta Ray Logo */}
                    <svg viewBox="0 0 24 24" className="manta-logo" fill="currentColor" style={{
                        width: '280px',
                        height: '280px',
                        color: '#6366f1',
                        filter: 'drop-shadow(0 0 30px rgba(99, 102, 241, 0.6))',
                        animation: 'float 4s ease-in-out infinite'
                    }}>
                        <path d="M12 2.5c-.8 0-1.5.5-1.5 1.5a1.5 1.5 0 0 0 3 0c0-1-.7-1.5-1.5-1.5zM3 9c0-1.1.9-2 2-2 1 0 2 1 3 1.5 1.5.8 2.5 1 4 1s2.5-.2 4-1c1-.5 2-1.5 3-1.5 1.1 0 2 .9 2 2 0 1.5-1.5 3.5-3.5 5-2 1.5-4 2-5.5 2s-3.5-.5-5.5-2C4.5 12.5 3 10.5 3 9zm9 7.5S10 20 10 22c0 1 2 1 2 1s2 0 2-1c0-2-2-5.5-2-5.5z" />
                    </svg>
                    <h1 suppressHydrationWarning>MÉTODO THI</h1>
                </div>

                <div className="right">
                    <h2 suppressHydrationWarning>{isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
                    <p suppressHydrationWarning>{isLogin ? 'Acesse sua área exclusiva para continuar.' : 'Comece sua jornada de alta performance agora.'}</p>

                    {error && (
                        <div className="error-box">
                            <AlertCircle size={18} />
                            <span suppressHydrationWarning>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {!isLogin && (
                            <div className="input-group">
                                <label suppressHydrationWarning>Nome</label>
                                <input
                                    type="text"
                                    placeholder="Seu Nome"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={!isLogin}
                                    suppressHydrationWarning
                                />
                            </div>
                        )}

                        <div className="input-group">
                            <label suppressHydrationWarning>E-mail</label>
                            <input
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                suppressHydrationWarning
                            />
                        </div>

                        <div className="input-group">
                            <label suppressHydrationWarning>Senha</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                suppressHydrationWarning
                            />
                            <button
                                type="button"
                                className="eye-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                ) : (
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                )}
                            </button>
                        </div>

                        <button type="submit" className="btn" disabled={loading} onClick={handleRipple}>
                            {loading ? (
                                <Loader2 className="animate-spin mx-auto text-white" />
                            ) : (
                                <span suppressHydrationWarning>{isLogin ? 'ENTRAR' : 'CADASTRAR'}</span>
                            )}
                        </button>
                    </form>

                    <div className="toggle-link" onClick={() => { setIsLogin(!isLogin); setError(''); }} suppressHydrationWarning>
                        {isLogin ? 'Ainda não tem conta? Crie agora' : 'Já tem uma conta? Faça login'}
                    </div>
                </div>
            </div>
        </div>
    );
}
