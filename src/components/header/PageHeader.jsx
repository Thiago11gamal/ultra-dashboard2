import React from 'react';
import { motion as Motion } from 'framer-motion';

const PageHeader = ({ title, description }) => {
    return (
        <div className="mb-8">
            <Motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                    {title}
                </h1>
                <p className="text-slate-400 text-sm font-medium max-w-2xl">
                    {description}
                </p>
                <div className="mt-4 h-1 w-20 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
            </Motion.div>
        </div>
    );
};

export default PageHeader;
