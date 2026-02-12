import { useState } from 'react';
import { submitFeedback } from '../services/api';
import './FeedbackButtons.css';

/**
 * FeedbackButtons Component
 * 
 * Displays thumbs up/down buttons for user feedback on answers.
 * 
 * CRITICAL: This component is for observation only. Feedback does NOT:
 * - Modify future answers
 * - Affect retrieval or generation
 * - Trigger re-querying or learning
 * 
 * Feedback is stored for analysis purposes only.
 */
export default function FeedbackButtons({ question, answer, numChunksRetrieved, onFeedbackSubmitted }) {
    const [feedbackGiven, setFeedbackGiven] = useState(null); // 'positive', 'negative', or null
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleFeedback = async (feedbackType) => {
        if (feedbackGiven || isSubmitting) return; // Prevent multiple submissions

        setIsSubmitting(true);
        setError(null);

        try {
            const feedbackData = {
                question,
                answer,
                feedback: feedbackType,
                num_chunks_retrieved: numChunksRetrieved,
                timestamp: new Date().toISOString()
            };

            await submitFeedback(feedbackData);

            setFeedbackGiven(feedbackType);

            // Notify parent component if callback provided
            if (onFeedbackSubmitted) {
                onFeedbackSubmitted(feedbackType);
            }
        } catch (err) {
            console.error('Feedback submission error:', err);
            setError('Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="feedback-section">
            <p className="feedback-prompt">Was this answer helpful?</p>

            <div className="feedback-buttons">
                <button
                    className={`feedback-btn feedback-btn-positive ${feedbackGiven === 'positive' ? 'active' : ''}`}
                    onClick={() => handleFeedback('positive')}
                    disabled={feedbackGiven !== null || isSubmitting}
                    aria-label="Helpful"
                >
                    <span className="feedback-icon">👍</span>
                    <span className="feedback-label">Helpful</span>
                </button>

                <button
                    className={`feedback-btn feedback-btn-negative ${feedbackGiven === 'negative' ? 'active' : ''}`}
                    onClick={() => handleFeedback('negative')}
                    disabled={feedbackGiven !== null || isSubmitting}
                    aria-label="Not helpful"
                >
                    <span className="feedback-icon">👎</span>
                    <span className="feedback-label">Not helpful</span>
                </button>
            </div>

            {feedbackGiven && (
                <p className="feedback-confirmation">
                    Thank you for your feedback!
                </p>
            )}

            {error && (
                <p className="feedback-error">
                    {error}
                </p>
            )}
        </div>
    );
}
