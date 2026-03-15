import { useState, useCallback } from 'react';
import { uploadFile, pollIngestStatus } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function FileUpload({ onUploadSuccess }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [jobStatuses, setJobStatuses] = useState([]);
    const [particles, setParticles] = useState([]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => setIsDragging(false), []);

    const triggerParticles = useCallback(() => {
        const newParticles = Array.from({ length: 12 }, (_, i) => ({
            id: Date.now() + i,
            x: Math.random() * 100,
            angle: (i / 12) * 360,
            color: ['#00d4ff','#a855f7','#39FF14'][i % 3],
        }));
        setParticles(newParticles);
        setTimeout(() => setParticles([]), 1000);
    }, []);

    const processFiles = async (files) => {
        if (!files || files.length === 0) return;

        const validTypes = [
            'application/pdf',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/markdown',
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        const validExtensions = ['.pdf', '.txt', '.md', '.docx', '.csv', '.xlsx', '.xls'];

        const validFiles = Array.from(files).filter(file => {
            const ext = '.' + file.name.split('.').pop().toLowerCase();
            return validTypes.includes(file.type) || validExtensions.includes(ext);
        });

        if (validFiles.length === 0) {
            setMessage({ type: 'error', text: 'No valid files selected. Supported: PDF, DOCX, TXT, CSV, Excel.' });
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setMessage(null);
        setJobStatuses([]);

        try {
            // Phase 1: POST bytes — backend returns 202 immediately with job IDs
            const result = await uploadFile(validFiles, (percent) => {
                setUploadProgress(percent);
            });

            const jobs = result.jobs || [];
            const rejected = result.rejected || [];

            // Show queued state per job — UI unfreezes here
            setJobStatuses(jobs.map(j => ({ job_id: j.job_id, filename: j.filename, status: 'QUEUED' })));
            setIsUploading(false);
            setUploadProgress(0);

            if (rejected.length > 0) {
                setMessage({ type: 'error', text: `Rejected: ${rejected.map(r => r.file).join(', ')}` });
            }

            if (jobs.length === 0) return;

            // Phase 2: Poll each job until COMPLETE or FAILED
            const results = await Promise.all(
                jobs.map(j =>
                    pollIngestStatus(j.job_id, (status) => {
                        setJobStatuses(prev =>
                            prev.map(s => s.job_id === j.job_id ? { ...s, status } : s)
                        );
                    })
                )
            );

            const failed = results.filter(r => r.status === 'FAILED');
            const completed = results.filter(r => r.status === 'COMPLETE');

            if (failed.length === 0) {
                setMessage({ type: 'success', text: `${completed.length} file(s) ingested successfully.` });
            } else {
                setMessage({
                    type: 'error',
                    text: `${completed.length} complete, ${failed.length} failed: ${failed.map(f => f.filename).join(', ')}`
                });
            }

            if (completed.length > 0 && onUploadSuccess) {
                onUploadSuccess();
                triggerParticles();
            }
            setJobStatuses([]);

        } catch (error) {
            console.log("Upload error:", error);
            setIsUploading(false);
            setUploadProgress(0);
            setJobStatuses([]);
            if (error.response && error.response.data) {
                setMessage({ type: 'error', text: JSON.stringify(error.response.data) });
            } else if (error.message) {
                setMessage({ type: 'error', text: error.message });
            } else {
                setMessage({ type: 'error', text: "Upload failed. Unknown error." });
            }
        }
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            processFiles(e.dataTransfer.files);
        }
    }, [processFiles]);

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
    };

    const statusIcon = (status) => {
        if (status === 'COMPLETE') return '✓';
        if (status === 'FAILED') return '✗';
        if (status === 'PROCESSING') return '⟳';
        return '…';
    };

    const statusColor = (status) => {
        if (status === 'COMPLETE') return 'text-green-400';
        if (status === 'FAILED') return 'text-red-400';
        return 'text-[#f5f5f7]';
    };

    return (
        <motion.div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            animate={{ scale: isDragging ? 1.02 : 1 }}
            transition={{ duration: 0.2 }}
            className="w-full"
        >
            <AnimatePresence>
                {particles.map(p => (
                    <motion.div
                        key={p.id}
                        initial={{ opacity: 1, scale: 1, x: `${p.x}%`, y: '50%' }}
                        animate={{
                            opacity: 0, scale: 0,
                            x: `${p.x + Math.cos(p.angle * Math.PI/180) * 60}%`,
                            y: `${50 + Math.sin(p.angle * Math.PI/180) * 60}%`,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{
                            position: 'absolute', width: 6, height: 6, borderRadius: '50%',
                            background: p.color, pointerEvents: 'none', zIndex: 10,
                        }}
                    />
                ))}
            </AnimatePresence>
            <div
                className={`apple-upload-zone p-8 text-center ${isDragging ? 'drag-over' : ''} ${isUploading ? 'opacity-40 pointer-events-none' : ''}`}
            >
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.txt,.md,.docx,.csv,.xlsx,.xls"
                    disabled={isUploading}
                    multiple
                />

                <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center cursor-pointer h-full"
                >
                    <div className="w-14 h-14 mb-4 rounded-2xl flex items-center justify-center transition-all duration-200" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(245,245,247,0.5)' }}>
                        {isUploading ? (
                            <div className="w-7 h-7 rounded-full animate-spin" style={{ border: '1.5px solid rgba(245,245,247,0.1)', borderTopColor: '#f5f5f7' }}></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" style={{ color: 'rgba(245,245,247,0.45)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        )}
                    </div>

                    <p className="text-[15px] font-semibold mb-1 tracking-[-0.01em]" style={{ color: '#f5f5f7' }}>
                        {isUploading ? 'Uploading...' : 'Drop files to upload'}
                    </p>
                    <p className="apple-caption">
                        PDF, DOCX, TXT, CSV, Excel
                    </p>
                </label>
            </div>

            {isUploading && (
               <div className="mt-4 px-1">
                 <div className="flex justify-between apple-caption mb-2">
                   <span>Uploading</span>
                   <span>{uploadProgress}%</span>
                 </div>
                 <div className="apple-progress-track">
                   <motion.div
                     className="h-full rounded-full" style={{ background: '#f5f5f7' }}
                     initial={{ width: 0 }}
                     animate={{ width: `${uploadProgress}%` }}
                     transition={{ duration: 0.15 }}
                   />
                 </div>
               </div>
            )}

            {/* Per-job status list */}
            {jobStatuses.length > 0 && (
                <div className="mt-3 space-y-1">
                    {jobStatuses.map(j => (
                        <div key={j.job_id} className="flex items-center gap-2 text-[11px] px-2 py-1 rounded-lg" style={{ color: 'rgba(245,245,247,0.6)', background: 'rgba(255,255,255,0.03)' }}>
                            <span className={j.status === 'PROCESSING' ? 'animate-spin inline-block' : ''}>
                                {statusIcon(j.status)}
                            </span>
                            <span className="truncate flex-1">{j.filename}</span>
                            <span className="uppercase tracking-wider opacity-70">{j.status}</span>
                        </div>
                    ))}
                </div>
            )}

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 rounded-xl border text-[13px] flex items-center gap-2"
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '0.5px solid rgba(255,255,255,0.12)',
                        color: message.type === 'success' ? 'rgba(245,245,247,0.8)' : 'rgba(245,245,247,0.5)'
                    }}
                >
                    <span>{message.type === 'success' ? '✓' : '⚠'}</span>
                    {message.text}
                </motion.div>
            )}
        </motion.div>
    );
}
