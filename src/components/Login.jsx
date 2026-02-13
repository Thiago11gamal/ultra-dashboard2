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
                    {/* Manta Ray Logo Silhouette */}
                    <svg viewBox="0 0 24 24" className="manta-logo" fill="currentColor" style={{
                        width: '280px',
                        height: '280px',
                        color: '#818cf8',
                        filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.5))',
                        animation: 'float 6s ease-in-out infinite'
                    }}>
                        <path d="M12,2c-5,0-9,3-9,7c0,2,2,3,4,4c0.5,2,2,5,3,9c0.2,0.8,1.8,0.8,2,0c1-4,2.5-7,3-9c2-1,4-2,4-4C19,5,16,2,12,2z M12,6 c0.6,0,1,0.4,1,1s-0.4,1-1,1s-1-0.4-1-1S11.4,6,12,6z" opacity="0.9" />
                        <path d="M22,9c-1-2-4-2-7-1c-0.5-0.5-1-1-1.8-1.4C15.5,5,18,3,20,3c0.6,0,1,0.4,1,1C21,5.5,21.5,7,22,9z" opacity="0.7" />
                        <path d="M2,9c1-2,4-2,7-1c0.5-0.5,1-1,1.8-1.4C8.5,5,6,3,4,3C3.4,3,3,3.4,3,4C3,5.5,2.5,7,2,9z" opacity="0.7" />
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
