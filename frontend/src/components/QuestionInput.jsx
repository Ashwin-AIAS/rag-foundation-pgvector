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
                <div className="relative flex-none w-full sm:w-40">
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        disabled={disabled || isLoading}
                        className="w-full bg-cyber-darker border border-cyber-primary/30 rounded-lg px-4 py-3
                                 text-cyber-text focus:outline-none focus:border-cyber-primary
                                 focus:shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-all duration-300
                                 disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
                        style={{
                            backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2300d4ff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                            backgroundPosition: 'right 0.5rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1.5em 1.5em'
                        }}
                    >
                        <option value="hybrid"> Hybrid Search</option>
                        <option value="vector"> Vector Only</option>
                        <option value="graph"> Graph RAG</option>
                    </select>
                </div>
                
                <motion.div
                    animate={{ boxShadow: question.length > 0 ? '0 0 15px rgba(0,212,255,0.2)' : '0 0 0px transparent' }}
                    transition={{ duration: 0.3 }}
                    className="relative flex-1"
                >
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder={disabled ? '> SYSTEM OFFLINE — upload documents to activate' : '> ENTER QUERY PROTOCOL...'}
                        disabled={disabled || isLoading}
                        className={`
              w-full bg-cyber-darker border border-cyber-primary/30 rounded-lg px-4 py-3 
              text-cyber-text placeholder-cyber-text/30 focus:outline-none focus:border-cyber-primary 
              focus:shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
                    />
                    {isLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-cyber-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </motion.div>

                <motion.button
                    whileHover={{ scale: 1.04, boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)' }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    type="submit"
                    disabled={disabled || isLoading || !question.trim()}
                    data-cursor-hover="true"
                    className={`
                      relative overflow-hidden px-6 py-3 rounded-lg font-bold uppercase tracking-wider text-sm
                      transition-all duration-300 font-display
                      ${disabled || isLoading || !question.trim()
                        ? 'bg-cyber-darker border border-cyber-text/10 text-cyber-text/20 cursor-not-allowed'
                        : 'bg-gradient-to-r from-cyber-primary to-[#00a3cc] text-black border border-cyber-primary shadow-neon-sm'
                      }
                    `}
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                            </svg>
                            PROCESSING
                        </span>
                    ) : 'EXECUTE'}
                </motion.button>
            </form>
        </div>
    );
}

export default QuestionInput;

