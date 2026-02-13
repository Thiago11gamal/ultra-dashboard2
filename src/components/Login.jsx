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
            <style>{`
                canvas { position: absolute; top:0; left:0; z-index:0; }
                .container { width:1100px; height:650px; display:flex; background:rgba(10,15,35,0.85); border-radius:25px; backdrop-filter:blur(12px); box-shadow:0 0 60px rgba(0,0,0,0.6); overflow:hidden; position:relative; z-index:2; animation:fadeIn 1.5s ease forwards; }
                .left { width:50%; background:radial-gradient(circle,#1e3a8a 0%,#0b1120 70%); display:flex; align-items:center; justify-content:center; flex-direction:column; padding:40px; position:relative; }
                .left img { width:320px; animation:float 4s ease-in-out infinite; filter:drop-shadow(0 0 25px rgba(0,150,255,0.7)); }
                .left h1 { font-family: 'Cinzel', serif; font-size: 2.5rem; margin-top: 20px; color: #fff; text-shadow: 0 0 20px rgba(0,150,255,0.8); text-align: center; }
                .right { width:50%; padding:60px; display:flex; flex-direction:column; justify-content:center; color:white; }
                .right h2 { font-size:28px; margin-bottom:10px; font-weight: 600; }
                .right p { opacity:0.7; margin-bottom:30px; font-size: 1rem; }
                .input-group { margin-bottom:25px; position: relative; }
                .input-group label { font-size:14px; letter-spacing:2px; opacity:0.7; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 5px; }
                .input-group input { width:100%; padding:15px; border-radius:12px; border:none; margin-top:0px; background:#1c233f; color:white; font-size:16px; outline:none; transition:0.3s; box-sizing: border-box; }
                .input-group input:focus { box-shadow:0 0 15px #6366f1; background:#242c55; }
                
                .btn { margin-top:20px; padding:18px; border:none; border-radius:15px; font-size:18px; font-weight:bold; letter-spacing:2px; cursor:pointer; background:linear-gradient(90deg,#6366f1,#9333ea); color:white; transition:0.4s; box-shadow:0 0 20px rgba(147,51,234,0.6); width: 100%; position: relative; overflow: hidden; }
                .btn:hover { transform:scale(1.02); box-shadow:0 0 35px rgba(147,51,234,0.9); }
                .btn:disabled { opacity: 0.7; cursor: not-allowed; }
                
                .toggle-link { margin-top: 20px; text-align: center; font-size: 0.9rem; opacity: 0.8; cursor: pointer; transition: 0.3s; }
                .toggle-link:hover { opacity: 1; color: #6366f1; text-decoration: underline; }
                
                .error-box { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 12px; border-radius: 10px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; }
                
                .eye-btn { position: absolute; right: 15px; top: 38px; background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.5); transition: color 0.3s; }
                .eye-btn:hover { color: #fff; }

                .ripple { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.4); transform: scale(0); animation: rippleAnim 0.6s linear; pointer-events: none; }
                @keyframes rippleAnim { to { transform: scale(4); opacity: 0; } }

                @keyframes fadeIn { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
                @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-20px); } }
                @media(max-width:1000px) { .container { flex-direction:column; height:auto; width: 95%; } .left, .right { width:100%; } .left { padding:60px 20px; } .left img { width: 180px; } .left h1 { font-size: 1.8rem; } }
            `}</style>

            <canvas ref={canvasRef} />

            <div className="container">
                <div className="left">
                    <img src="/logo-thi.png" alt="Método THI Logo" />
                    <h1>MÉTODO THI</h1>
                </div>

                <div className="right">
                    <h2>{isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
                    <p>{isLogin ? 'Acesse sua área exclusiva para continuar.' : 'Comece sua jornada de alta performance agora.'}</p>

                    {error && (
                        <div className="error-box">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {!isLogin && (
                            <div className="input-group">
                                <label>Nome</label>
                                <input
                                    type="text"
                                    placeholder="Seu Nome"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={!isLogin}
                                />
                            </div>
                        )}

                        <div className="input-group">
                            <label>E-mail</label>
                            <input
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Senha</label>
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
                                <span>{isLogin ? 'ENTRAR' : 'CADASTRAR'}</span>
                            )}
                        </button>
                    </form>

                    <div className="toggle-link" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                        {isLogin ? 'Ainda não tem conta? Crie agora' : 'Já tem uma conta? Faça login'}
                    </div>
                </div>
            </div>
        </div>
    );
}
