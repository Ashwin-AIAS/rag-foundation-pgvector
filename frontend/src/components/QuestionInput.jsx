import { useState } from 'react';
import { motion } from 'framer-motion';

function QuestionInput({ onQueryStart, disabled, isLoading }) {
    const [question, setQuestion] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!question.trim() || disabled || isLoading) return;

        // Delegate query handling entirely to the parent (App.jsx)
        if (onQueryStart) {
            onQueryStart(question);
        }
        setQuestion('');
    };

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder={disabled ? "Upload documents to initialize system..." : "Enter query protocol..."}
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
                </div>

                <motion.button
                    whileHover={{ scale: 1.02, boxShadow: "0 0 15px rgba(0, 212, 255, 0.4)" }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={disabled || isLoading || !question.trim()}
                    className={`
            px-6 py-3 rounded-lg font-bold uppercase tracking-wider text-sm transition-all duration-300
            ${disabled || isLoading || !question.trim()
                            ? 'bg-cyber-darker border border-cyber-text/10 text-cyber-text/20 cursor-not-allowed'
                            : 'bg-gradient-to-r from-cyber-primary to-[#00a3cc] text-black border border-cyber-primary shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                        }
          `}
                >
                    {isLoading ? 'PROCESSING...' : 'EXECUTE'}
                </motion.button>
            </form>
        </div>
    );
}

export default QuestionInput;

