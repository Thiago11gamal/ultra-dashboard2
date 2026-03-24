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
                    <svg viewBox="0 0 200 200" className="manta-logo" fill="currentColor" style={{
                        width: '320px',
                        height: '320px',
                        color: '#a5b4fc',
                        filter: 'drop-shadow(0 0 40px rgba(99, 102, 241, 0.4))',
                        animation: 'float 6s ease-in-out infinite'
                    }}>
                        {/* Head crest / horn */}
                        <path d="M95,42 C97,28 100,20 100,20 C100,20 103,28 105,42 Q105,50 100,52 Q95,50 95,42 Z" opacity="0.85" />
                        {/* Main body + wings */}
                        <path d="M100,52 C108,52 118,56 130,64 C148,76 172,88 196,92 C192,98 180,104 160,106 C140,108 124,106 114,102 C108,112 104,126 102,138 L100,138 C100,138 96,126 90,110 L86,102 C76,106 60,108 40,106 C20,104 8,98 4,92 C28,88 52,76 70,64 C82,56 92,52 100,52 Z" />
                        {/* Wing tips — sharp elegant curves */}
                        <path d="M196,92 Q200,88 198,82 C195,86 194,90 196,92 Z" opacity="0.6" />
                        <path d="M4,92 Q0,88 2,82 C5,86 6,90 4,92 Z" opacity="0.6" />
                        {/* Internal wing definition */}
                        <path d="M100,62 C125,62 155,76 168,96 C148,104 125,108 100,108 C75,108 52,104 32,96 C45,76 75,62 100,62 Z" opacity="0.12" />
                        {/* Tail — flowing S-curve */}
                        <path d="M100,138 C100,148 96,160 88,170 C80,180 72,186 68,192 C66,196 70,198 76,194 C84,188 94,176 100,162 C102,158 102,152 102,148 Z" opacity="0.75" />
                        {/* Eyes */}
                        <ellipse cx="90" cy="72" rx="3" ry="2.5" opacity="0.35" />
                        <ellipse cx="110" cy="72" rx="3" ry="2.5" opacity="0.35" />
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
