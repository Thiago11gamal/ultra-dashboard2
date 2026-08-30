import React, { useState, useRef } from 'react';
import { useAuth } from '../context/useAuth';
import { isLocalMode } from '../services/firebase';
import { User, Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import logo from '../assets/logo.png';
import './Login.css';
// ✅ FIX S01: Sanitização mais robusta usando DOMPurify
import DOMPurify from 'dompurify';

// FIX 5.1a: Sanitização de entrada contra XSS
const sanitizeInput = (value, maxLength = 200) => {
    if (typeof value !== 'string') return '';

    // Passo 1: Limitar comprimento
    const truncated = value.slice(0, maxLength);

    // Passo 2: Sanitizar com DOMPurify (remove HTML malicioso)
    const sanitized = DOMPurify.sanitize(truncated, {
        ALLOWED_TAGS: [],    // Nenhuma tag HTML permitida
        ALLOWED_ATTR: [],    // Nenhum atributo permitido
    });

    // Passo 3: Remover padrões perigosos restantes
    return sanitized
        .replace(/javascript\s*:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/data\s*:/gi, '')
        .replace(/vbscript\s*:/gi, '')
        .replace(/expression\s*\(/gi, '')
        .replace(/url\s*\(/gi, '')
        .replace(/eval\s*\(/gi, '')
        .replace(/document\s*\./gi, '')
        .replace(/window\s*\./gi, '')
        .trim();
};

// FIX 5.1b: Validação de email no frontend
const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// FIX 5.1c: Validação de força de senha
const getPasswordStrength = (password) => {
    if (!password) return { level: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    if (score <= 1) return { level: 1, label: 'Fraca', color: '#ef4444' };
    if (score <= 2) return { level: 2, label: 'Média', color: '#f59e0b' };
    if (score <= 3) return { level: 3, label: 'Boa', color: '#22c55e' };
    return { level: 4, label: 'Forte', color: '#10b981' };
};

// FIX 5.1e: Função ripple movida para fora do componente para evitar recriação
function handleRipple(e) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.width = r.style.height = `${btn.offsetWidth}px`;
    r.style.left = `${e.clientX - rect.left - btn.offsetWidth / 2}px`;
    r.style.top = `${e.clientY - rect.top - btn.offsetWidth / 2}px`;
    btn.appendChild(r);
    setTimeout(() => r.remove(), 600);
}

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [nameError, setNameError] = useState('');
    const { login, signup } = useAuth();
    const isMounted = React.useRef(true);
    const errorRef = useRef(null); // FIX 5.1a: ref para anunciar erros

    React.useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    // FIX 5.1a: Anunciar erro para leitores de tela
    React.useEffect(() => {
        if (error && errorRef.current) {
            errorRef.current.setAttribute('aria-live', 'assertive');
        }
    }, [error]);

    const handleEmailChange = (e) => {
        const value = sanitizeInput(e.target.value, 254); // RFC 5321 max email length
        setEmail(value);
        setEmailError('');
        setError('');
    };

    const handleNameChange = (e) => {
        const value = sanitizeInput(e.target.value, 100);
        setName(value);
        setNameError('');
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value.slice(0, 128)); // Limite máximo de senha
        setError('');
    };

    const validateForm = () => {
        let hasError = false;

        if (!isValidEmail(email)) {
            setEmailError('Formato de email inválido');
            hasError = true;
        }

        if (!isLogin) {
            if (!name.trim()) {
                setNameError('Nome é obrigatório');
                hasError = true;
            }
            if (password.length < 6) {
                setError('A senha deve ter pelo menos 6 caracteres.');
                hasError = true;
            }
        }

        return !hasError;
    };

    async function handleSubmit(e) {
        e.preventDefault();

        if (!validateForm()) return;

        setError('');
        setEmailError('');
        setNameError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email.trim(), password);
            } else {
                if (!name.trim()) throw new Error("Por favor, insira seu nome.");
                if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
                const hasMixed = /[a-z]/.test(password) && /[0-9]/.test(password);
                if (!hasMixed) {
                    throw new Error("Sua senha deve conter letras e números para maior segurança.");
                }
                await signup(email.trim(), password, sanitizeInput(name, 100));
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

    const passwordStrength = getPasswordStrength(password);

    return (
        <div style={{
            fontFamily: "'Segoe UI', sans-serif",
            backgroundColor: "#0b1120",
            background: "radial-gradient(circle at 20% 20%,#1e3a8a,#0b1120 60%)",
            color: "#fff",
            overflow: "hidden",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative"
        }}>
            <div className="container" role="main" aria-label="Autenticação Ultra Dashboard">
                <div className="left">
                    <img src={logo} alt="Ultra Dashboard" className="manta-logo-img" style={{
                        width: '320px',
                        filter: 'drop-shadow(0 0 40px rgba(99,102,241,0.4))',
                        animation: 'float 6s ease-in-out infinite'
                    }} />
                    <h1 suppressHydrationWarning>MÉTODO ARRAIA</h1>
                </div>
                <div className="right">
                    <h2 suppressHydrationWarning>{isLocalMode ? 'Modo Local' : (isLogin ? 'Bem-vindo de volta' : 'Crie sua conta')}</h2>
                    <p suppressHydrationWarning>{isLocalMode ? 'O serviço de nuvem está indisponível. Você entrará no modo offline.' : (isLogin ? 'Acesse sua área exclusiva para continuar.' : 'Comece sua jornada de alta performance agora.')}</p>

                    {/* FIX 5.1a: Região aria-live para anúncios de erro */}
                    <div ref={errorRef} aria-live="assertive" aria-atomic="true">
                        {error && (
                            <div className="error-box" role="alert">
                                <AlertCircle size={18} />
                                <span suppressHydrationWarning>{error}</span>
                            </div>
                        )}
                        {emailError && (
                            <div className="error-box" role="alert" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>
                                <AlertCircle size={18} />
                                <span>{emailError}</span>
                            </div>
                        )}
                        {nameError && (
                            <div className="error-box" role="alert" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>
                                <AlertCircle size={18} />
                                <span>{nameError}</span>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                        {!isLogin && (
                            <div className="input-group">
                                <label suppressHydrationWarning htmlFor="user-name">Nome</label>
                                <input
                                    id="user-name"
                                    type="text"
                                    placeholder="Seu Nome"
                                    value={name}
                                    onChange={handleNameChange}
                                    required={!isLogin}
                                    suppressHydrationWarning
                                    autoComplete="name"
                                    maxLength={100}
                                    aria-invalid={!!nameError}
                                    aria-describedby={nameError ? "name-error" : undefined}
                                />
                                {nameError && <p id="name-error" className="field-error" role="alert">{nameError}</p>}
                            </div>
                        )}
                        <div className="input-group">
                            <label suppressHydrationWarning htmlFor="user-email">E-mail</label>
                            <input
                                id="user-email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={handleEmailChange}
                                required
                                suppressHydrationWarning
                                autoComplete="email"
                                maxLength={254}
                                aria-invalid={!!emailError}
                                aria-describedby={emailError ? "email-error" : undefined}
                            />
                            {emailError && <p id="email-error" className="field-error" role="alert">{emailError}</p>}
                        </div>
                        <div className="input-group">
                            <label suppressHydrationWarning htmlFor="user-password">Senha</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="user-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    required
                                    suppressHydrationWarning
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                    maxLength={128}
                                    aria-describedby="password-hint"
                                />
                                {/* FIX 5.1d: Botão de mostrar/ocultar senha com acessibilidade */}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="eye-btn"
                                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                    aria-pressed={showPassword}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {/* FIX 5.1c: Indicador de força de senha */}
                            {!isLogin && password && (
                                <div style={{ marginTop: '8px' }} aria-describedby="password-hint">
                                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} style={{
                                                height: '4px',
                                                flex: 1,
                                                borderRadius: '2px',
                                                backgroundColor: i <= passwordStrength.level ? passwordStrength.color : '#334155',
                                                transition: 'background-color 0.3s'
                                            }} />
                                        ))}
                                    </div>
                                    <span style={{ fontSize: '11px', color: passwordStrength.color }} id="password-hint">
                                        Força: {passwordStrength.label}
                                    </span>
                                </div>
                            )}
                        </div>
                        <button type="submit" className="btn" disabled={loading} onClick={handleRipple}>
                            {loading ? (
                                <Loader2 className="animate-spin mx-auto text-white" />
                            ) : (
                                <span suppressHydrationWarning>{isLogin ? 'ENTRAR' : 'CADASTRAR'}</span>
                            )}
                        </button>
                    </form>
                    <button
                        type="button"
                        className="toggle-link w-full bg-transparent border-none cursor-pointer text-center"
                        onClick={() => { setIsLogin(!isLogin); setError(''); setEmailError(''); setNameError(''); }}
                        suppressHydrationWarning
                    >
                        {isLogin ? 'Ainda não tem conta? Crie agora' : 'Já tem uma conta? Faça login'}
                    </button>
                </div>
            </div>
        </div>
    );
}

