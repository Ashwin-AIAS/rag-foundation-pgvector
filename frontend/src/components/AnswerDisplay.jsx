import FeedbackButtons from './FeedbackButtons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function ThinkingSkeleton() {
    return (
        <div className="thinking-skeleton">
            <div className="thinking-header">
                <span className="thinking-dot"></span>
                <span className="thinking-label">Thinking…</span>
            </div>
            <div className="skeleton-lines">
                <div className="skeleton-line skeleton-line-long"></div>
                <div className="skeleton-line skeleton-line-medium"></div>
                <div className="skeleton-line skeleton-line-short"></div>
                <div className="skeleton-line skeleton-line-long"></div>
                <div className="skeleton-line skeleton-line-medium"></div>
            </div>
        </div>
    );
}

export default function AnswerDisplay({ answer, isLoading, isThinking }) {
    // Empty state
    if (!answer && !isLoading && !isThinking) {
        return (
            <div className="answer-display">
                <h2>Answer</h2>
                <div className="empty-state">
                    Your answer will appear here
                </div>
            </div>
        );
    }

    // Thinking skeleton — shown before first streaming token arrives
    const showSkeleton = isThinking && (!answer?.answer || answer.answer.length === 0);

    // Table Response
    if (answer?.answer_type === 'table' && answer.columns && answer.rows) {
        return (
            <div className="answer-display">
                <h2>Generated Analysis</h2>
                <div className="answer-markdown mb-4">
                    <div className="answer-wrapper">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {answer.answer}
                        </ReactMarkdown>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-cyber-primary/20 shadow-[0_0_15px_rgba(0,212,255,0.05)] custom-scrollbar max-h-[500px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gradient-to-r from-cyber-darker to-cyber-primary/10 sticky top-0 z-10">
                            <tr>
                                {answer.columns.map((col, idx) => (
                                    <th key={idx} className="p-3 text-xs font-bold text-cyber-primary uppercase tracking-wider border-b border-cyber-primary/20 whitespace-nowrap">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-cyber-darker/50 divide-y divide-white/5">
                            {answer.rows.map((row, rowIdx) => (
                                <tr key={rowIdx} className="hover:bg-cyber-primary/5 transition-colors duration-200">
                                    {answer.columns.map((col, colIdx) => (
                                        <td key={colIdx} className="p-3 text-sm text-cyber-text border-r border-white/5 last:border-r-0 whitespace-nowrap">
                                            {row[col]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4">
                    <FeedbackButtons
                        question={answer.question}
                        answer={answer.answer}
                        numChunksRetrieved={answer.num_chunks_retrieved}
                    />
                </div>
            </div>
        );
    }

    // Display answer with skeleton or content
    return (
        <div className="answer-display">
            <h2>Answer</h2>
            {showSkeleton ? (
                <ThinkingSkeleton />
            ) : (
                <>
                    <div className="answer-markdown">
                        <div className="answer-wrapper">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {answer?.answer || ""}
                            </ReactMarkdown>
                        </div>
                    </div>
                    {answer?.answer && !isThinking && (
                        <FeedbackButtons
                            question={answer.question}
                            answer={answer.answer}
                            numChunksRetrieved={answer.num_chunks_retrieved}
                        />
                    )}
                </>
            )}
        </div>
    );
}

