import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOADING_MESSAGES = [
    "Analyzing Document...",
    "Embedding chunks...",
    "Searching context...",
    "Generating answer..."
];

export default function LoadingOverlay({ isLoading }) {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        if (!isLoading) {
            setMessageIndex(0);
            return;
        }

        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000); // Change message every 2 seconds

        return () => clearInterval(interval);
    }, [isLoading]);

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-cyber-darker/80 backdrop-blur-sm"
                >
                    <div className="flex flex-col items-center gap-6 p-8 bg-cyber-darker border border-cyber-primary/20 rounded-2xl shadow-[0_0_50px_rgba(0,212,255,0.1)]">
                        {/* Spinner */}
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-cyber-primary/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-cyber-primary border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-4 bg-cyber-primary/10 rounded-full blur-md animate-pulse"></div>
                        </div>

                        {/* Text */}
                        <div className="flex flex-col items-center gap-2 min-w-[200px]">
                            <motion.span
                                key={messageIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-xl font-bold text-cyber-primary tracking-wide text-center"
                            >
                                {LOADING_MESSAGES[messageIndex]}
                            </motion.span>
                            <span className="text-sm text-cyber-text/50">
                                Please wait...
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
