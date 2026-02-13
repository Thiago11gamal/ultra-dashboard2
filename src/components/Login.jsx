import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login, signup } = useAuth();
    const canvasRef = useRef(null);

    // Starfield Animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let W, H, stars = [];
        let animationFrameId;

        function init() {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
            stars = Array.from({ length: 180 }, () => ({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.4 + 0.2,
                a: Math.random(),
                spd: Math.random() * 0.4 + 0.1,
                dir: Math.random() * Math.PI * 2
            }));
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);
            stars.forEach(s => {
                s.a += (Math.random() - 0.5) * 0.04;
                s.a = Math.max(0.05, Math.min(1, s.a));
                s.x += Math.cos(s.dir) * s.spd * 0.25;
                s.y += Math.sin(s.dir) * s.spd * 0.25;
                if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
                if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;

                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(200, 190, 255, ' + s.a + ')';
                ctx.fill();
            });
            animationFrameId = requestAnimationFrame(draw);
        }

        window.addEventListener('resize', init);
        init();
        draw();

        return () => {
            window.removeEventListener('resize', init);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

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
        <div style={{
            fontFamily: "'Outfit', sans-serif",
            background: "#030b1a",
            color: "#e8e4ff",
            overflow: "hidden",
            minHeight: "100vh",
            position: "relative"
        }}>
            <style>{`
            canvas { position: fixed; inset: 0; z-index: 0; }
            .orbs { position: fixed; inset: 0; z-index: 1; pointer-events: none; }
            .orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: .45; animation: drift linear infinite; }
            .orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, #4f0aad 0%, transparent 70%); top: -10%; left: -10%; animation-duration: 22s; }
            .orb-2 { width: 420px; height: 420px; background: radial-gradient(circle, #0d4bce 0%, transparent 70%); bottom: -15%; right: -8%; animation-duration: 28s; animation-delay: -8s; }
            .orb-3 { width: 280px; height: 280px; background: radial-gradient(circle, #00d4ff33 0%, transparent 70%); top: 40%; left: 60%; animation-duration: 18s; animation-delay: -4s; }
            @keyframes drift {
                0% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(30px, -40px) scale(1.08); }
                66% { transform: translate(-20px, 30px) scale(.94); }
                100% { transform: translate(0, 0) scale(1); }
            }
            .grid-overlay {
                position: fixed; inset: 0; z-index: 2; pointer-events: none;
                background-image: linear-gradient(rgba(100, 80, 255, .04) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 80, 255, .04) 1px, transparent 1px);
                background-size: 60px 60px;
            }
            .page { position: relative; z-index: 10; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
            .card {
                width: 100%; max-width: 430px;
                background: linear-gradient(135deg, rgba(13, 27, 62, .85) 0%, rgba(6, 15, 36, .9) 100%);
                border: 1px solid rgba(124, 58, 237, .35); border-radius: 24px; padding: 52px 44px 48px;
                backdrop-filter: blur(28px);
                box-shadow: 0 0 0 1px rgba(255, 255, 255, .04) inset, 0 40px 100px rgba(3, 11, 26, .8), 0 0 60px rgba(93, 33, 208, .2);
                animation: cardIn .9s cubic-bezier(.22, 1, .36, 1) both;
            }
            @keyframes cardIn { from { opacity: 0; transform: translateY(36px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
            .logo-wrap { display: flex; justify-content: center; margin-bottom: 32px; animation: fadeDown .7s .15s both; }
            .logo-icon {
                width: 58px; height: 58px; background: linear-gradient(135deg, #7c3aed 0%, #00d4ff 100%);
                border-radius: 16px; display: flex; align-items: center; justify-content: center;
                box-shadow: 0 0 28px rgba(124, 58, 237, .6), 0 0 60px rgba(0, 212, 255, .15); position: relative; overflow: hidden;
            }
            .logo-icon::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255, 255, 255, .25) 0%, transparent 60%); }
            .card-title {
                font-family: 'Cinzel', serif; font-size: 1.5rem; font-weight: 600; letter-spacing: .04em;
                background: linear-gradient(120deg, #e0d7ff 0%, #00d4ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
                text-align: center; margin-bottom: 6px; animation: fadeDown .7s .25s both;
            }
            .method-title {
                text-align: center; font-size: 1.8rem; font-weight: 800; color: #fff;
                margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.1em;
                background: linear-gradient(to right, #fff, #a5f3fc, #fff);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-size: 200% auto;
                animation: shine 3s linear infinite, fadeDown 0.7s 0.2s both;
            }
            @keyframes shine {
                to { background-position: 200% center; }
            }
            .card-sub { text-align: center; color: #7c7ca8; font-size: .85rem; letter-spacing: .02em; margin-bottom: 40px; animation: fadeDown .7s .35s both; }
            @keyframes fadeDown { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }
            .field { position: relative; margin-bottom: 22px; animation: fadeUp .7s both; }
            @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
            .field label { display: block; font-size: .78rem; font-weight: 500; color: #a78bfa; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 8px; }
            .input-wrap { position: relative; }
            .input-wrap.icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); opacity: .45; pointer-events: none; transition: opacity .25s; }
            .input-wrap:focus-within.icon { opacity: 1; }
            .input-wrap input {
                width: 100%; background: rgba(5, 14, 35, .7); border: 1px solid rgba(124, 58, 237, .3); border-radius: 12px;
                padding: 14px 16px 14px 46px; font-family: 'Outfit', sans-serif; font-size: .95rem; color: #e8e4ff; outline: none;
                transition: border-color .3s, box-shadow .3s, background .3s; caret-color: #00d4ff;
            }
            .input-wrap input:focus { border-color: #7c3aed; background: rgba(8, 18, 48, .85); box-shadow: 0 0 0 3px rgba(124, 58, 237, .2), 0 0 20px rgba(124, 58, 237, .1); }
            .input-wrap::after {
                content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 0; height: 2px;
                background: linear-gradient(90deg, #7c3aed, #00d4ff); border-radius: 0 0 12px 12px; transition: width .35s cubic-bezier(.22, 1, .36, 1);
            }
            .input-wrap:focus-within::after { width: 80%; }
            .eye-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #7c7ca8; padding: 4px; transition: color .2s; }
            .eye-btn:hover { color: #a78bfa; }
            .opts { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; animation: fadeUp .7s .65s both; }
            .remember { display: flex; align-items: center; gap: 8px; cursor: pointer; }
            .remember input[type=checkbox] { display: none; }
            .chk-box { width: 18px; height: 18px; border: 1.5px solid rgba(124, 58, 237, .5); border-radius: 5px; display: flex; align-items: center; justify-content: center; background: rgba(5, 14, 35, .8); transition: border-color .2s, background .2s; flex-shrink: 0; }
            .remember input:checked ~ .chk-box { border-color: #7c3aed; background: #7c3aed; }
            .remember span { font-size: .82rem; color: #7c7ca8; user-select: none; }
            .forgot { font-size: .82rem; color: #a78bfa; text-decoration: none; transition: color .2s; }
            .forgot:hover { color: #00d4ff; }
            .btn-wrap { animation: fadeUp .7s .75s both; }
            .btn {
                width: 100%; padding: 15px;
                background: linear-gradient(135deg, #5a1fd6 0%, #7c3aed 50%, #0d9cce 100%); background-size: 200% 200%;
                border: none; border-radius: 14px; font-family: 'Outfit', sans-serif; font-size: 1rem; font-weight: 600; color: #fff;
                letter-spacing: .05em; text-transform: uppercase; cursor: pointer; position: relative; overflow: hidden;
                box-shadow: 0 8px 32px rgba(93, 33, 208, .45), 0 2px 0 rgba(255, 255, 255, .08) inset;
                transition: background-position .5s, box-shadow .3s, transform .15s;
            }
            .btn:hover { background-position: 100% 100%; box-shadow: 0 12px 40px rgba(93, 33, 208, .6), 0 0 30px rgba(0, 212, 255, .2); transform: translateY(-1px); }
            .btn:active { transform: translateY(1px); }
            .btn::before {
                content: ''; position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .18), transparent);
                transform: skewX(-20deg); animation: shimmer 3s 2s infinite;
            }
            @keyframes shimmer { 0% { left: -100%; } 40% { left: 140%; } 100% { left: 140%; } }
            .ripple { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, .25); transform: scale(0); animation: rippleAnim .6s linear; pointer-events: none; }
            @keyframes rippleAnim { to { transform: scale(4); opacity: 0; } }
            .divider { display: flex; align-items: center; gap: 12px; margin: 28px 0; animation: fadeUp .7s .85s both; }
            .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(124, 58, 237, .35), transparent); }
            .divider span { font-size: .75rem; color: #7c7ca8; white-space: nowrap; }
            .card-footer { text-align: center; margin-top: 30px; font-size: .82rem; color: #7c7ca8; animation: fadeUp .7s 1.05s both; }
            .card-footer button { background: none; border: none; color: #a78bfa; cursor: pointer; text-decoration: none; transition: color .2s; font-family: inherit; font-size: inherit; }
            .card-footer button:hover { color: #00d4ff; }
            `}</style>
            <canvas ref={canvasRef} />

            <div className="orbs">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            <div className="grid-overlay"></div>

            <div className="page">
                <div className="card">
                    {/* Header */}
                    <div className="logo-wrap">
                        <div className="logo-icon">
                            {/* Manta Ray / Arraia Logo */}
                            <svg viewBox="0 0 24 24" width="38" height="38" fill="#fff">
                                <path d="M12 2.5c-.8 0-1.5.5-1.5 1.5a1.5 1.5 0 0 0 3 0c0-1-.7-1.5-1.5-1.5zM3 9c0-1.1.9-2 2-2 1 0 2 1 3 1.5 1.5.8 2.5 1 4 1s2.5-.2 4-1c1-.5 2-1.5 3-1.5 1.1 0 2 .9 2 2 0 1.5-1.5 3.5-3.5 5-2 1.5-4 2-5.5 2s-3.5-.5-5.5-2C4.5 12.5 3 10.5 3 9zm9 7.5S10 20 10 22c0 1 2 1 2 1s2 0 2-1c0-2-2-5.5-2-5.5z" />
                            </svg>
                        </div>
                    </div>

                    <h1 className="method-title">MÉTODO THI</h1>

                    <h2 className="card-title">{isLogin ? 'Bem-vindo' : 'Criar Conta'}</h2>
                    <p className="card-sub">{isLogin ? 'Acesse sua área exclusiva' : 'Inicie sua jornada ultra'}</p>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-200 text-sm flex items-center gap-2 animate-fade-in">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {!isLogin && (
                            <div className="field">
                                <label>Nome</label>
                                <div className="input-wrap">
                                    <span className="icon">
                                        <User size={16} color="#a78bfa" />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Seu Nome"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required={!isLogin}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="field">
                            <label>E-mail</label>
                            <div className="input-wrap">
                                <span className="icon">
                                    <Mail size={16} color="#a78bfa" />
                                </span>
                                <input
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label>Senha</label>
                            <div className="input-wrap">
                                <span className="icon">
                                    <Lock size={16} color="#a78bfa" />
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="eye-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                    ) : (
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {isLogin && (
                            <div className="opts">
                                <label className="remember">
                                    <input type="checkbox" />
                                    <div className="chk-box">
                                        <svg className="chk-mark" width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                    <span>Lembrar-me</span>
                                </label>
                                <a href="#" className="forgot">Esqueci a senha</a>
                            </div>
                        )}

                        <div className="btn-wrap" style={{ marginTop: isLogin ? 0 : '30px' }}>
                            <button type="submit" className="btn" disabled={loading} onClick={handleRipple}>
                                {loading ? (
                                    <Loader2 className="animate-spin mx-auto text-white" />
                                ) : (
                                    <span className="btn-text">{isLogin ? 'Entrar' : 'Cadastrar'}</span>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="card-footer">
                        {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
                        <button onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                            {isLogin ? 'Criar conta grátis' : 'Fazer Login'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
