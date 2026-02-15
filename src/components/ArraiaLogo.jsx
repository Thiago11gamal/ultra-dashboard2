import React from 'react';

export default function ArraiaLogo({ className = 'w-10 h-10', glow = true, title = 'Logo Arraia Método THI' }) {
    return (
        <svg
            viewBox="0 0 220 220"
            className={className}
            role="img"
            aria-label={title}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="arraiaBody" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c4b5fd" />
                    <stop offset="55%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id="arraiaDetail" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.6" />
                </linearGradient>
                {glow && (
                    <filter id="arraiaGlow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feColorMatrix
                            in="blur"
                            type="matrix"
                            values="1 0 0 0 0.35  0 1 0 0 0.28  0 0 1 0 0.9  0 0 0 0.65 0"
                        />
                    </filter>
                )}
            </defs>

            <g transform="translate(10 8)">
                <path
                    d="M100 50c46 0 87 19 100 52-17 12-51 21-82 22-7 16-15 28-18 32-3-4-11-16-18-32-31-1-65-10-82-22 13-33 54-52 100-52Z"
                    fill="url(#arraiaBody)"
                    filter={glow ? 'url(#arraiaGlow)' : undefined}
                />
                <path
                    d="M82 53c-8-13-1-26 9-28 5 1 6 11 2 20l-3 8zM118 53c8-13 1-26-9-28-5 1-6 11-2 20l3 8z"
                    fill="url(#arraiaDetail)"
                />
                <path
                    d="M100 66c30 0 59 13 72 37-20 8-46 12-72 12s-52-4-72-12c13-24 42-37 72-37Z"
                    fill="#ffffff"
                    opacity="0.17"
                />
                <path
                    d="M100 155c0 24-18 36-43 44-6 2-5 6 2 6 34 0 58-21 58-50z"
                    fill="url(#arraiaDetail)"
                    opacity="0.9"
                />
            </g>
        </svg>
    );
}
