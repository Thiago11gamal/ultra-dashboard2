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
                    {/* Manta Ray Silhouette Logo (Refined to match image) */}
                    <svg viewBox="0 0 200 200" className="manta-logo" fill="currentColor" style={{
                        width: '320px',
                        height: '320px',
                        color: '#a5b4fc', // Indigo 300
                        filter: 'drop-shadow(0 0 40px rgba(99, 102, 241, 0.4))',
                        animation: 'float 6s ease-in-out infinite'
                    }}>
                        {/* Body & Wings (Jamanta Style: Broad, Triangular, Majestic) */}
                        <path d="M100,55 
                                 C145,55 185,75 198,105 
                                 C180,115 150,122 120,122 
                                 C115,135 108,148 100,152 
                                 C92,148 85,135 80,122 
                                 C50,122 20,115 2,105 
                                 C15,75 55,55 100,55 Z" />
                        {/* Cephalic Fins (Jamanta Horns - More curved and prominent) */}
                        <path d="M82,57 C75,45 82,32 90,34 C94,36 92,48 88,58 Z" />
                        <path d="M118,57 C125,45 118,32 110,34 C106,36 108,48 112,58 Z" />

                        {/* Internal wing definition/shadow (Subtle) */}
                        <path d="M100,65 C130,65 160,80 170,105 C150,112 125,115 100,115 C75,115 50,112 30,105 C40,80 70,65 100,65 Z" opacity="0.15" />

                        {/* Tail (Long and elegant) */}
                        <path d="M100,152 C100,175 80,185 60,192 C55,193 55,195 62,195 C90,195 112,180 112,152 Z" />
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
