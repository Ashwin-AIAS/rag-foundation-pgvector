import { useState, useEffect } from 'react';
import { getAnalytics } from '../services/api';
import { motion } from 'framer-motion';

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
                        <motion.div
                            className="bar-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round((d[valueKey] / maxVal) * 100)}%` }}
                            transition={{ duration: 0.8, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
                            style={{ background: ['rgba(245,245,247,0.9)', 'rgba(245,245,247,0.65)', 'rgba(245,245,247,0.5)', 'rgba(245,245,247,0.35)'][i % 4] }}
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
            <motion.button
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                className="analytics-toggle font-display"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{isOpen ? '▾' : '▸'}</span>
                <span>ANALYTICS</span>
            </motion.button>

            {isOpen && (
                <div className="analytics-body">
                    {isLoading ? (
                        <p className="analytics-loading">Loading analytics…</p>
                    ) : analytics ? (
                        <>
                            {/* KPI Cards */}
                            <div className="kpi-grid">
                                {[
                                  { label: 'Total Queries', value: analytics.total_queries },
                                  { label: 'Avg Response', value: `${analytics.avg_response_time_ms}ms` },
                                  { label: 'Avg Confidence', value: `${analytics.avg_confidence}%` },
                                ].map((kpi, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="kpi-card group hover:border-white/20 transition-all duration-300"
                                    style={{ cursor: 'default' }}
                                  >
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ type: 'spring', delay: 0.2 + index * 0.1, stiffness: 400, damping: 20 }}
                                      className="kpi-value"
                                      style={{
                                        background: 'linear-gradient(135deg, rgba(245,245,247,0.8), rgba(245,245,247,0.4))',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                      }}
                                    >
                                      {kpi.value}
                                    </motion.div>
                                    <div className="kpi-label">{kpi.label}</div>
                                  </motion.div>
                                ))}
                            </div>

                            {/* Daily Query Volume */}
                            {analytics.daily_counts && analytics.daily_counts.length > 0 && (
                                <div className="analytics-section">
                                    <h4 className="analytics-section-title font-display">Daily Volume (14d)</h4>
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
                                    <h4 className="analytics-section-title font-display">Recent Queries</h4>
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
