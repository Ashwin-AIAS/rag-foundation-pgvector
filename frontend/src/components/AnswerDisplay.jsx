import FeedbackButtons from './FeedbackButtons';
// Removed AnswerDisplay.css import

export default function AnswerDisplay({ answer, isLoading }) {
    // Empty state
    if (!answer && !isLoading) {
        return (
            <div className="answer-display">
                <h2>Answer</h2>
                <div className="empty-state">
                    Your answer will appear here
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="answer-display">
                <h2>Answer</h2>
                <div className="loading-state">
                    <span className="spinner"></span>
                </div>
            </div>
        );
    }

    // Display answer and feedback buttons
    return (
        <div className="answer-display">
            <h2>Answer</h2>
            <div className="answer-content">
                {answer.answer}
            </div>
            {/* Feedback buttons - shown for all answers including refusals */}
            <FeedbackButtons
                question={answer.question}
                answer={answer.answer}
                numChunksRetrieved={answer.num_chunks_retrieved}
            />
        </div>
    );
}
