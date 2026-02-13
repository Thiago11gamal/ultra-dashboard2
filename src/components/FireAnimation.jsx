
import React, { useEffect, useRef } from 'react';

const FireAnimation = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let W, H;
        let particles = [];
        let particleCount = 200; // Adjust for density
        let animationFrameId;

        // Fire Colors - Warm
        // const colors = ['#ff5a00', '#ff9a00', '#ffce00', '#ffe808']; 

        // Fire Colors - Mystical/Blue/Purple (Matches theme better? User asked for "fire", usually means orange)
        // Let's go with a stylized "Magic Fire" that blends blue/purple at base to orange/red at tips?
        // Or just standard fire. "Fire animation" typically implies real fire colors.
        // Let's do a high-quality standard fire but maybe slightly stylized.
        const colors = [
            { r: 255, g: 90, b: 0, a: 1 },   // Red-Orange
            { r: 255, g: 154, b: 0, a: 1 },  // Orange
            { r: 255, g: 206, b: 0, a: 1 },  // Yellow
            { r: 255, g: 232, b: 8, a: 1 }   // Bright Yellow
        ];

        const init = () => {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;

            // Create initial particles
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(createParticle());
            }
        };

        const createParticle = () => {
            return {
                x: Math.random() * W,
                y: H + Math.random() * 100, // Start below screen
                vx: (Math.random() - 0.5) * 2,
                vy: Math.random() * -5 - 2, // Upward velocity
                size: Math.random() * 4 + 1,
                life: Math.random() * 0.5 + 0.5, // 1.0 is full life
                decay: Math.random() * 0.01 + 0.005,
                color: colors[Math.floor(Math.random() * colors.length)]
            };
        };

        const draw = () => {
            // Clear with trail effect
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Trail strength
            ctx.fillRect(0, 0, W, H);

            ctx.globalCompositeOperation = 'screen'; // Additive blending for fire glow

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                ctx.beginPath();
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
                gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.life})`);
                gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);

                ctx.fillStyle = gradient;
                ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
                ctx.fill();

                // Update
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.decay;

                // Wobble/Turbulence
                p.vx += (Math.random() - 0.5) * 0.1;

                // Reset if dead
                if (p.life <= 0 || p.y < -50) {
                    particles[i] = createParticle();
                }
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', init);
        init();
        draw();

        return () => {
            window.removeEventListener('resize', init);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none"
            style={{ background: 'transparent' }}
        />
    );
};

export default FireAnimation;
