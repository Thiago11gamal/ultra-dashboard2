import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
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

    // Bug Fix: track mount status to prevent React warnings when closing modal during analysis
    const isMounted = React.useRef(true);

    React.useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

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
                await login(email.trim(), password);
            } else {
                if (!name.trim()) throw new Error("Por favor, insira seu nome.");
                if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");

                // Basic entropy check
                const hasMixed = /[a-z]/.test(password) && /[0-9]/.test(password);
                if (!hasMixed) {
                    throw new Error("Sua senha deve conter letras e números para maior segurança.");
                }

                await signup(email.trim(), password, name);
            }
        } catch (err) {
            console.error(err);
            let msg = "Falha na autenticação.";
            if (err.code === 'auth/invalid-credential') msg = "E-mail ou senha incorretos.";
            else if (err.code === 'auth/email-already-in-use') msg = "Este e-mail já está cadastrado.";
            else if (err.code === 'auth/weak-password') msg = "A senha deve ter pelo menos 6 caracteres.";
            else if (err.code === 'auth/user-not-found') msg = "Usuário não encontrado.";
            else if (err.code === 'auth/wrong-password') msg = "Senha incorreta.";
            else if (err.code === 'auth/too-many-requests') msg = "Muitas tentativas. Aguarde alguns instantes.";
            else if (err.code === 'auth/network-request-failed') msg = "Erro de conexão. Verifique sua internet.";
            else if (err.message) msg = err.message;
            setError(msg);
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
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
                    {/* Manta Ray Silhouette Logo (Refined to match image) */}
                    <svg viewBox="0 0 500 400" className="manta-logo" style={{
                        width: '380px',
                        height: '310px',
                        filter: 'drop-shadow(0 0 40px rgba(99, 102, 241, 0.4))',
                        animation: 'float 6s ease-in-out infinite'
                    }}>
                        <defs>
                            <linearGradient id="mWingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#c7d2fe" stopOpacity="1"/>
                                <stop offset="50%" stopColor="#818cf8" stopOpacity="0.85"/>
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5"/>
                            </linearGradient>
                            <linearGradient id="mBodyGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                                <stop offset="0%" stopColor="#e0e7ff" stopOpacity="1"/>
                                <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.8"/>
                            </linearGradient>
                            <filter id="mGlow">
                                <feGaussianBlur stdDeviation="3" result="blur"/>
                                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                        </defs>
                        <g transform="translate(250,160)" filter="url(#mGlow)">
                            {/* Wings — broad sweeping curves */}
                            <path d="M-20,-10 C-80,-20 -180,-60 -210,-55 C-230,-50 -200,10 -150,40 C-80,80 -40,100 0,105 C40,100 80,80 150,40 C200,10 230,-50 210,-55 C180,-60 80,-20 20,-10 C10,-5 -10,-5 -20,-10 Z" fill="url(#mWingGrad)"/>
                            {/* Cephalic fins (horns) */}
                            <path d="M-15,-10 C-25,-30 -20,-50 -10,-58 C-5,-62 0,-50 0,-38" fill="#a5b4fc" opacity="0.85"/>
                            <path d="M15,-10 C25,-30 20,-50 10,-58 C5,-62 0,-50 0,-38" fill="#a5b4fc" opacity="0.85"/>
                            {/* Central body */}
                            <ellipse cx="0" cy="20" rx="30" ry="45" fill="url(#mBodyGrad)" opacity="0.45"/>
                            {/* Wing highlight lines */}
                            <path d="M15,-8 C70,-18 140,-48 195,-52" stroke="#e0e7ff" strokeWidth="0.8" fill="none" opacity="0.2"/>
                            <path d="M-15,-8 C-70,-18 -140,-48 -195,-52" stroke="#e0e7ff" strokeWidth="0.8" fill="none" opacity="0.2"/>
                            <path d="M18,0 C80,0 150,-20 190,-35" stroke="#e0e7ff" strokeWidth="0.6" fill="none" opacity="0.12"/>
                            <path d="M-18,0 C-80,0 -150,-20 -190,-35" stroke="#e0e7ff" strokeWidth="0.6" fill="none" opacity="0.12"/>
                            {/* Tail — elegant flowing curve */}
                            <path d="M0,105 C5,140 15,175 5,210 C-5,235 -20,248 -25,255 Q-28,260 -24,258 C-15,250 -5,232 0,210 C5,188 8,160 5,135 C3,120 1,110 0,105 Z" fill="#a5b4fc" opacity="0.6"/>
                            {/* Eyes */}
                            <ellipse cx="-10" cy="-2" rx="2.5" ry="1.8" fill="#e0e7ff" opacity="0.45"/>
                            <ellipse cx="10" cy="-2" rx="2.5" ry="1.8" fill="#e0e7ff" opacity="0.45"/>
                        </g>
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
                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
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
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                required
                                suppressHydrationWarning
                            />
                            {!isLogin && password && (
                                <div className="pw-strength-container" style={{ marginTop: '8px' }}>
                                    <div style={{
                                        height: '4px',
                                        width: '100%',
                                        backgroundColor: '#334155',
                                        borderRadius: '2px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: password.length < 6 ? '30%' : (/[0-9]/.test(password) && /[a-z]/.test(password) ? '100%' : '60%'),
                                            backgroundColor: password.length < 6 ? '#ef4444' : (/[0-9]/.test(password) && /[a-z]/.test(password) ? '#10b981' : '#f59e0b'),
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                                        {password.length < 6 ? 'Senha muito curta' : (/[0-9]/.test(password) && /[a-z]/.test(password) ? 'Senha forte' : 'Senha média')}
                                    </span>
                                </div>
                            )}
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
