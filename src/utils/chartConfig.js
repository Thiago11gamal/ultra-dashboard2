/**
 * Centralized Configuration for Charts
 */

export const CHART_COLORS = {
    primary: "#818cf8", // Indigo
    secondary: "#a78bfa", // Purple
    success: "#34d399", // Emerald
    warning: "#fb923c", // Orange
    danger: "#f87171", // Red
    target: "#22c55e", // Green (Target Score)
    text: {
        primary: "#f1f5f9",
        secondary: "#94a3b8",
        muted: "#64748b"
    },
    background: {
        glass: "rgba(15, 23, 42, 0.4)",
        tooltip: "rgba(15, 23, 42, 0.95)",
        grid: "rgba(255, 255, 255, 0.05)"
    }
};

export const CHART_GRADIENTS = {
    bar: {
        id: "barGradient",
        stops: [
            { offset: "0%", color: "#a855f7" },
            { offset: "100%", color: "#3b82f6" }
        ]
    },
    area: {
        id: "areaGradient",
        stops: [
            { offset: "0%", color: "rgba(34, 197, 94, 0.6)" },
            { offset: "100%", color: "rgba(34, 197, 94, 0.1)" }
        ]
    },
    curve: {
        id: "curveGradient",
        stops: [
            { offset: "0%", color: "rgba(59, 130, 246, 0.5)" },
            { offset: "100%", color: "rgba(59, 130, 246, 0.0)" }
        ]
    }
};

export const CHART_DEFAULTS = {
    targetScore: 75,
    margin: { top: 20, right: 10, left: -25, bottom: 10 },
    tooltipStyle: {
        backgroundColor: CHART_COLORS.background.tooltip,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "12px",
        padding: "12px",
        fontSize: "12px"
    }
};
