import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

function QuestionInput({ onQueryStart, disabled, isLoading }) {
    const [question, setQuestion] = useState('');
    const [mode, setMode] = useState('hybrid');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!question.trim() || disabled || isLoading) return;

        // Delegate query handling entirely to the parent (App.jsx)
        if (onQueryStart) {
            onQueryStart(question, mode);
        }
        setQuestion('');
    };

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-none w-full sm:w-44">
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        disabled={disabled || isLoading}
                        className="apple-select"
                    >
                        <option value="hybrid"> Hybrid Search</option>
                        <option value="vector"> Vector Only</option>
                        <option value="graph"> Graph RAG</option>
                    </select>
                </div>
                
                <motion.div
                    className="relative flex-1"
                >
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder={disabled ? '> Upload documents to begin...' : '> Ask anything about your documents...'}
                        disabled={disabled || isLoading}
                        className="apple-input breathing-input"
                    />
                    {isLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '1.5px solid rgba(245,245,247,0.15)', borderTopColor: '#f5f5f7' }}></div>
                        </div>
                    )}
                </motion.div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    type="submit"
                    disabled={disabled || isLoading || !question.trim()}
                    data-cursor-hover="true"
                    className={
                      disabled || isLoading || !question.trim()
                        ? 'apple-btn apple-btn-primary opacity-30 cursor-not-allowed'
                        : 'apple-btn apple-btn-primary'
                    }
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                            </svg>
                            <span className="shimmer-text font-semibold">Analyzing...</span>
                        </span>
                    ) : 'Analyze'}
                </motion.button>
            </form>
        </div>
    );
}

export default QuestionInput;

