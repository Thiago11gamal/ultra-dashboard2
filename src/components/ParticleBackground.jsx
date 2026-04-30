import { useCallback } from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

const ParticleBackground = () => {
    const particlesInit = useCallback(async engine => {
        await loadSlim(engine);
    }, []);

    return (
        <Particles
            id="tsparticles"
            init={particlesInit}
            options={{
                fullScreen: { enable: true, zIndex: -1 },
                background: {
                    color: {
                        value: "transparent",
                    },
                },
                fpsLimit: 60,
                particles: {
                    number: {
                        value: 40,
                        density: {
                            enable: true,
                            area: 800,
                        },
                    },
                    color: {
                        value: ["#a855f7", "#3b82f6", "#ec4899"], // Purple, Blue, Pink
                    },
                    shape: {
                        type: "circle",
                    },
                    opacity: {
                        value: 0.3,
                        random: true,
                    },
                    size: {
                        value: { min: 1, max: 3 },
                    },
                    move: {
                        enable: true,
                        speed: 0.5,
                        direction: "none",
                        random: true,
                        outModes: "out",
                    },
                    links: {
                        enable: true,
                        color: "#ffffff",
                        distance: 150,
                        opacity: 0.05,
                        width: 1,
                    },
                },
                interactivity: {
                    events: {
                        onHover: {
                            enable: true,
                            mode: "grab",
                        },
                        onClick: {
                            enable: true,
                            mode: "push",
                        },
                    },
                    modes: {
                        grab: {
                            distance: 140,
                            links: {
                                opacity: 0.2,
                            },
                        },
                        push: {
                            quantity: 4,
                        },
                    },
                },
                detectRetina: true,
            }}
            className="fixed inset-0 pointer-events-none"
        />
    );
};

export default ParticleBackground;
