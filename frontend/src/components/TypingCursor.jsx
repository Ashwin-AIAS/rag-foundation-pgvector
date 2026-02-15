import './TypingCursor.css';

export default function TypingCursor({ isStreaming }) {
    if (!isStreaming) return null;
    return <span className="typing-cursor" aria-hidden="true">|</span>;
}
