import { useState } from 'react';
import { queryAgenticAnalyst } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Custom bar chart constructed with CSS and Framer Motion.
 */
function GlowingChart({ data, labelKey, valueKey }) {
    if (!data || data.length === 0) return null;

    // Extract values and handle parsing of numbers
    const parsedData = data.map(row => {
        const val = parseFloat(row[valueKey]);
        return {
            label: row[labelKey] || 'Unknown',
            value: isNaN(val) ? 0 : val
        };
    });

    const maxVal = Math.max(...parsedData.map(d => d.value), 1);
    const sumVal = parsedData.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="analytics-section mt-6 p-6 rounded-lg border border-white/5 bg-white/[0.02]" style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
            <h4 className="font-display text-sm tracking-[0.16em] uppercase mb-6 flex items-center gap-2" style={{ color: 'var(--av-panther-lt)' }}>
                <span className="flex h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]"></span>
                Dynamic Data Visualization
            </h4>

            {/* Custom Visual Bar Chart */}
            <div className="flex flex-col gap-5">
                {parsedData.map((item, idx) => {
                    const pct = Math.round((item.value / maxVal) * 100);
                    const share = sumVal > 0 ? Math.round((item.value / sumVal) * 100) : 0;
                    
                    return (
                        <div key={idx} className="flex flex-col gap-1.5 group">
                            {/* Bar Label Info */}
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-mono text-white/80 group-hover:text-purple-400 transition-colors font-medium">
                                    {item.label}
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-white/40 text-[10px]">
                                        {share}% share
                                    </span>
                                    <span className="font-mono font-bold text-purple-400">
                                        {item.value}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Bar Track & Fill */}
                            <div className="h-6 w-full bg-white/[0.03] border border-white/5 rounded overflow-hidden relative flex items-center pl-3">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 1, ease: 'easeOut', delay: idx * 0.05 }}
                                    className="h-full absolute left-0 top-0 opacity-80"
                                    style={{
                                        background: `linear-gradient(90deg, rgba(139,92,246,0.15), rgba(168,85,247,0.45) 50%, rgba(192,132,252,0.6) 100%)`,
                                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)',
                                    }}
                                />
                                {/* Cyberpunk scanning light overlay in bar */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
                                
                                <span className="relative z-10 font-mono text-[10px] text-white/60 font-semibold uppercase tracking-wider group-hover:text-white transition-colors">
                                    Metric Unit: {item.value}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Legend / Metrics Footer */}
            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-white/30 font-mono">
                <span>DATAPOINTS: {parsedData.length}</span>
                <span>AGGREGATE TOTAL: {sumVal}</span>
            </div>
        </div>
    );
}

export default function AgenticAnalyst() {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [activeView, setActiveView] = useState('table'); // 'table' | 'chart'

    const sampleQueries = [
        { label: '📊 Status Distribution', q: 'Show the number of applications grouped by Status.' },
        { label: '🏢 Top Applied Companies', q: 'List the top 5 companies by number of job applications, ordered by count descending.' },
        { label: '📅 Applying Trend', q: 'Show apply count by apply date, ordered by Date of apply.' },
        { label: '❌ Rejected Applications', q: 'Show all companies where the application status is Rejected.' }
    ];

    const handleSubmit = async (e, forcedPrompt = null) => {
        if (e) e.preventDefault();
        
        const finalPrompt = forcedPrompt || prompt;
        if (!finalPrompt.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults(null);

        try {
            const response = await queryAgenticAnalyst(finalPrompt);
            setResults(response);
            
            // Auto-toggle to chart view if there is suitable numerical data
            if (response.data && response.data.length > 0) {
                const cols = Object.keys(response.data[0]);
                const numericCol = cols.find(col => {
                    const val = response.data[0][col];
                    return typeof val === 'number' || (!isNaN(parseFloat(val)) && isFinite(val));
                });
                if (numericCol && cols.length >= 2) {
                    setActiveView('chart');
                } else {
                    setActiveView('table');
                }
            }
        } catch (err) {
            console.error('Analyst query failed:', err);
            setError(err.message || 'An unexpected error occurred during execution.');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-detect columns for visualization
    let categoricalKey = '';
    let numericKey = '';
    if (results?.data && results.data.length > 0) {
        const firstRow = results.data[0];
        const keys = Object.keys(firstRow);
        
        // Find first key that contains strings/categorical values
        categoricalKey = keys.find(k => typeof firstRow[k] === 'string' && k.toLowerCase() !== 'id') || keys[0];
        
        // Find first key that contains numbers
        numericKey = keys.find(k => {
            const val = firstRow[k];
            return typeof val === 'number' || (!isNaN(parseFloat(val)) && isFinite(val));
        }) || keys[1];
    }

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
            <div className="station-card station-panther p-6">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-purple-500/10">
                    <h3 className="station-label station-label-panther flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.8)]"></span>
                        BIGQUERY AGENTIC ANALYST
                    </h3>
                    <span className="doc-selector-badge bg-purple-950/40 text-purple-400 border-purple-500/20">
                        ACTIVE WAREHOUSE
                    </span>
                </div>

                <p className="text-xs text-white/60 mb-6 font-mono max-w-3xl leading-relaxed">
                    Ask complex, unstructured analytical questions over your recruitment database. Gemini AI translates your natural language request into a secure, fully-optimized BigQuery SQL statement, executes it on the managed database, and maps the response to highly visual graphs instantly.
                </p>

                {/* Query Input */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., What is my application success rate or status breakdown?"
                            disabled={isLoading}
                            className="cap-input border-purple-500/20 focus:border-purple-500/60 focus:shadow-[0_0_12px_rgba(139,92,246,0.2)] pl-4 pr-32"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !prompt.trim()}
                            className="absolute right-2 top-2 btn-iron bg-purple-600 border-purple-500 shadow-purple-600/20 hover:bg-purple-500 hover:shadow-purple-500/40 py-1.5 px-5 text-[11px] font-bold h-[calc(100%-16px)] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: 'var(--av-panther)', borderColor: 'var(--av-panther-lt)' }}
                        >
                            {isLoading ? 'EXECUTING...' : 'RUN ANALYTICS'}
                        </button>
                    </div>

                    {/* Pre-seeded Queries */}
                    <div className="flex flex-wrap gap-2.5 mt-2">
                        {sampleQueries.map((item, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={(e) => {
                                    setPrompt(item.q);
                                    handleSubmit(e, item.q);
                                }}
                                disabled={isLoading}
                                className="font-mono text-[10px] text-white/40 hover:text-purple-400 bg-white/[0.01] hover:bg-purple-500/[0.04] border border-white/5 hover:border-purple-500/30 rounded py-1.5 px-3 transition-all duration-200"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </form>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 font-mono text-xs">
                    <div className="font-bold uppercase tracking-wider mb-1">🚨 WAREHOUSE QUERY FAILURE</div>
                    {error}
                </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
                <div className="station-card border-purple-500/10 p-8 flex flex-col items-center justify-center gap-4 bg-white/[0.01]">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 rounded-full border-2 border-purple-500/10" />
                        <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-xs font-bold tracking-[0.2em] text-purple-400 uppercase">
                            GEMINI COMPILING RELATIONAL LOGIC
                        </span>
                        <span className="font-mono text-[10px] text-white/40">
                            Translating English Prompt to BigQuery SQL Standard...
                        </span>
                    </div>
                </div>
            )}

            {/* Results Section */}
            {results && results.data && (
                <div className="flex flex-col gap-6">
                    {/* Expandable SQL diagnostics */}
                    {results.generated_sql && (
                        <div className="station-card border-purple-500/10 p-4 bg-white/[0.01]">
                            <details className="group">
                                <summary className="flex items-center justify-between cursor-pointer list-none select-none font-mono text-[10px] text-white/50 group-hover:text-purple-400 transition-colors">
                                    <span className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-purple-500 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                        COGNITIVE SQL QUERY LOGS (Gemini Generated)
                                    </span>
                                    <span className="text-white/20">CLICK TO EXPAND DETAILS</span>
                                </summary>
                                <div className="mt-3 pt-3 border-t border-purple-500/10 font-mono text-[11px] text-purple-300 bg-black/40 p-4 rounded overflow-x-auto leading-relaxed border border-white/5 select-all">
                                    {results.generated_sql}
                                </div>
                            </details>
                        </div>
                    )}

                    {/* KPI Cards / Summary block */}
                    {results.data.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="kpi-card bg-purple-950/10 border-purple-500/10 flex-row justify-between items-center px-5 py-4 w-full">
                                <div className="flex flex-col">
                                    <div className="kpi-label text-left">Record Count</div>
                                    <div className="kpi-value text-left text-white text-2xl font-bold">{results.data.length} rows</div>
                                </div>
                                <span className="text-purple-500/30 text-2xl">📊</span>
                            </div>
                            
                            {/* Render aggregate insights if numeric columns exist */}
                            {numericKey && (
                                <>
                                    <div className="kpi-card bg-purple-950/10 border-purple-500/10 flex-row justify-between items-center px-5 py-4 w-full">
                                        <div className="flex flex-col">
                                            <div className="kpi-label text-left">Max Value ({numericKey})</div>
                                            <div className="kpi-value text-left text-white text-2xl font-bold">
                                                {Math.max(...results.data.map(d => parseFloat(d[numericKey]) || 0))}
                                            </div>
                                        </div>
                                        <span className="text-purple-500/30 text-2xl">📈</span>
                                    </div>
                                    <div className="kpi-card bg-purple-950/10 border-purple-500/10 flex-row justify-between items-center px-5 py-4 w-full">
                                        <div className="flex flex-col">
                                            <div className="kpi-label text-left">Sum Total ({numericKey})</div>
                                            <div className="kpi-value text-left text-white text-2xl font-bold">
                                                {Math.round(results.data.reduce((acc, curr) => acc + (parseFloat(curr[numericKey]) || 0), 0) * 100) / 100}
                                            </div>
                                        </div>
                                        <span className="text-purple-500/30 text-2xl">➕</span>
                                    </div>
                                    <div className="kpi-card bg-purple-950/10 border-purple-500/10 flex-row justify-between items-center px-5 py-4 w-full">
                                        <div className="flex flex-col">
                                            <div className="kpi-label text-left">Average ({numericKey})</div>
                                            <div className="kpi-value text-left text-white text-2xl font-bold">
                                                {Math.round((results.data.reduce((acc, curr) => acc + (parseFloat(curr[numericKey]) || 0), 0) / results.data.length) * 100) / 100}
                                            </div>
                                        </div>
                                        <span className="text-purple-500/30 text-2xl">⚖️</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* View Switcher Tabs (Table vs Chart) */}
                    {results.data.length > 0 && categoricalKey && numericKey && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveView('table')}
                                className={`px-4 py-2 font-mono text-[10px] uppercase font-bold tracking-widest rounded border transition-all ${activeView === 'table' ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_8px_rgba(139,92,246,0.35)]' : 'bg-transparent border-white/10 text-white/50 hover:bg-white/[0.02]'}`}
                            >
                                📋 Data Table
                            </button>
                            <button
                                onClick={() => setActiveView('chart')}
                                className={`px-4 py-2 font-mono text-[10px] uppercase font-bold tracking-widest rounded border transition-all ${activeView === 'chart' ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_8px_rgba(139,92,246,0.35)]' : 'bg-transparent border-white/10 text-white/50 hover:bg-white/[0.02]'}`}
                            >
                                📈 Analytics Chart
                            </button>
                        </div>
                    )}

                    {/* Data Display Body */}
                    {results.data.length === 0 ? (
                        <div className="station-card border-white/5 p-8 text-center bg-white/[0.01]">
                            <p className="font-mono text-xs text-white/40">Query executed successfully, but no matching records were returned from BigQuery.</p>
                        </div>
                    ) : (
                        <div className="station-card border-purple-500/10 p-5 bg-white/[0.01]">
                            <AnimatePresence mode="wait">
                                {activeView === 'table' ? (
                                    <motion.div
                                        key="table"
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="overflow-x-auto max-h-[500px] custom-scrollbar"
                                    >
                                        <table className="answer-markdown table w-full">
                                            <thead>
                                                <tr>
                                                    {Object.keys(results.data[0]).map((col, idx) => (
                                                        <th key={idx} className="border-b border-purple-500/20 text-purple-400 font-bold uppercase tracking-wider py-3">
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.data.map((row, rowIdx) => (
                                                    <tr key={rowIdx} className="hover:bg-purple-500/[0.03] transition-colors border-b border-white/5">
                                                        {Object.keys(row).map((col, colIdx) => (
                                                            <td key={colIdx} className="py-2.5 px-3 font-mono text-xs text-white/70">
                                                                {row[col] === null ? (
                                                                    <span className="text-white/20">NULL</span>
                                                                ) : typeof row[col] === 'object' ? (
                                                                    JSON.stringify(row[col])
                                                                ) : (
                                                                    row[col].toString()
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="chart"
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <GlowingChart
                                            data={results.data}
                                            labelKey={categoricalKey}
                                            valueKey={numericKey}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
