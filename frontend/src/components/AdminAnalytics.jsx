import { useState, useEffect } from 'react';
import { getAnalytics } from '../services/api';

/**
 * Simple bar chart drawn with pure CSS divs (no external chart library).
 */
function MiniBarChart({ data, labelKey, valueKey, color = '#4fc3f7' }) {
    if (!data || data.length === 0)
        return <p className="analytics-empty">No data yet</p>;

    const maxVal = Math.max(...data.map(d => d[valueKey]), 1);

    return (
        <div className="mini-bar-chart">
            {data.map((d, i) => (
                <div key={i} className="bar-row">
                    <span className="bar-label">{d[labelKey]}</span>
                    <div className="bar-track">
                        <div
                            className="bar-fill"
                            style={{
                                width: `${(d[valueKey] / maxVal) * 100}%`,
                                background: color,
                            }}
                        />
                    </div>
                    <span className="bar-value">{d[valueKey]}</span>
                </div>
            ))}
        </div>
    );
}

export default function AdminAnalytics() {
    const [analytics, setAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await getAnalytics();
            setAnalytics(data);
        } catch (e) {
            console.error('Analytics fetch failed:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && !analytics) fetchData();
    }, [isOpen]);

    return (
        <div className="admin-analytics">
            <button
                className="analytics-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{isOpen ? '▾' : '▸'}</span>
                <span>ANALYTICS</span>
            </button>

            {isOpen && (
                <div className="analytics-body">
                    {isLoading ? (
                        <p className="analytics-loading">Loading analytics…</p>
                    ) : analytics ? (
                        <>
                            {/* KPI Cards */}
                            <div className="kpi-grid">
                                <div className="kpi-card">
                                    <span className="kpi-value">{analytics.total_queries}</span>
                                    <span className="kpi-label">Total Queries</span>
                                </div>
                                <div className="kpi-card">
                                    <span className="kpi-value">{analytics.avg_response_time_ms}ms</span>
                                    <span className="kpi-label">Avg Response</span>
                                </div>
                                <div className="kpi-card">
                                    <span className="kpi-value">{analytics.avg_confidence}%</span>
                                    <span className="kpi-label">Avg Confidence</span>
                                </div>
                            </div>

                            {/* Daily Query Volume */}
                            {analytics.daily_counts && analytics.daily_counts.length > 0 && (
                                <div className="analytics-section">
                                    <h4 className="analytics-section-title">Daily Volume (14d)</h4>
                                    <MiniBarChart
                                        data={analytics.daily_counts}
                                        labelKey="day"
                                        valueKey="count"
                                    />
                                </div>
                            )}

                            {/* Recent Queries */}
                            {analytics.recent_queries && analytics.recent_queries.length > 0 && (
                                <div className="analytics-section">
                                    <h4 className="analytics-section-title">Recent Queries</h4>
                                    <ul className="recent-list">
                                        {analytics.recent_queries.slice(0, 8).map((q, i) => (
                                            <li key={i} className="recent-item">
                                                <span className="recent-question">
                                                    {q.question.length > 60
                                                        ? q.question.slice(0, 60) + '…'
                                                        : q.question}
                                                </span>
                                                <div className="recent-meta">
                                                    <span className={`confidence-dot confidence-${q.confidence >= 80 ? 'high' : q.confidence >= 60 ? 'mid' : 'low'}`}>
                                                        {q.confidence}%
                                                    </span>
                                                    <span className="recent-time">{q.response_time_ms}ms</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button className="analytics-refresh" onClick={fetchData}>
                                ↻ Refresh
                            </button>
                        </>
                    ) : (
                        <p className="analytics-empty">No analytics available</p>
                    )}
                </div>
            )}
        </div>
    );
}
