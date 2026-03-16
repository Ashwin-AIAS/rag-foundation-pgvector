import { useState } from 'react';
import { submitFeedback } from '../services/api';
// Removed FeedbackButtons.css import

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
        <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
                <span className="station-label" style={{ color:'rgba(245,240,232,0.3)' }}>Rate Response:</span>

                <div className="flex gap-2">
                    <button
                        style={
                            feedbackGiven === 'positive'
                                ? { background:'rgba(192,160,48,0.1)', border:'1px solid rgba(192,160,48,0.35)', color:'#e8c040', padding:6, borderRadius:4, cursor:'pointer' }
                                : { background:'transparent', border:'1px solid rgba(245,240,232,0.1)', color:'rgba(245,240,232,0.35)', padding:6, borderRadius:4, cursor:'pointer' }
                        }
                        className={(feedbackGiven && feedbackGiven !== 'positive') || isSubmitting ? 'opacity-30 cursor-not-allowed' : ''}
                        onClick={() => handleFeedback('positive')}
                        disabled={feedbackGiven !== null || isSubmitting}
                        aria-label="Helpful"
                        title="Mark as Helpful"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                    </button>

                    <button
                        style={
                            feedbackGiven === 'negative'
                                ? { background:'rgba(192,57,27,0.1)', border:'1px solid rgba(192,57,27,0.35)', color:'#e8824a', padding:6, borderRadius:4, cursor:'pointer' }
                                : { background:'transparent', border:'1px solid rgba(245,240,232,0.1)', color:'rgba(245,240,232,0.35)', padding:6, borderRadius:4, cursor:'pointer' }
                        }
                        className={(feedbackGiven && feedbackGiven !== 'negative') || isSubmitting ? 'opacity-30 cursor-not-allowed' : ''}
                        onClick={() => handleFeedback('negative')}
                        disabled={feedbackGiven !== null || isSubmitting}
                        aria-label="Not helpful"
                        title="Mark as Unhelpful"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                        </svg>
                    </button>
                </div>
            </div>

            {feedbackGiven && (
                <div className="station-label station-label-thor">
                    FEEDBACK_LOGGED_SUCCESSFULLY
                </div>
            )}

            {error && (
                <div style={{ fontFamily:'Space Mono, monospace', fontSize:10, color:'rgba(192,57,27,0.8)' }}>
                    ERROR: {error}
                </div>
            )}
        </div>
    );
}
