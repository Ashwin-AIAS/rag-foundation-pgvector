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
                        className="jarvis-select"
                    >
                        <option value="hybrid"> Hybrid Search</option>
                        <option value="vector"> Vector Only</option>
                        <option value="graph"> Graph RAG</option>
                    </select>
                </div>
                
                <motion.div
                    animate={{ boxShadow: question.length > 0 ? '0 0 12px rgba(192,57,27,0.3)' : 'none' }}
                    transition={{ duration: 0.3 }}
                    className="relative flex-1"
                >
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder={disabled ? '// OFFLINE — UPLOAD DATA TO ACTIVATE //' : '// ENTER QUERY FOR JARVIS...'}
                        disabled={disabled || isLoading}
                        className="jarvis-input"
                    />
                    {isLoading && (
                        <div className="arc-reactor" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                            <div className="arc-reactor-ring" style={{ width: 18, height: 18 }}></div>
                            <div className="arc-reactor-core" style={{ width: 6, height: 6 }}></div>
                        </div>
                    )}
                </motion.div>

                <motion.button
                    whileHover={!disabled && !isLoading && question.trim() ? { scale: 1.03, y: -1 } : {}}
                    whileTap={!disabled && !isLoading && question.trim() ? { scale: 0.97 } : {}}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    type="submit"
                    disabled={disabled || isLoading || !question.trim()}
                    className={
                      disabled || isLoading || !question.trim()
                        ? 'im-btn im-btn-primary opacity-30 cursor-not-allowed'
                        : 'im-btn im-btn-primary'
                    }
                >
                    {isLoading ? 'PROCESSING' : 'EXECUTE'}
                </motion.button>
            </form>
        </div>
    );
}

export default QuestionInput;

