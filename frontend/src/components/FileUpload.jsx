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
        return 'text-cyber-primary';
    };

    return (
        <motion.div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            animate={{
                borderColor: isDragging ? 'rgba(0,212,255,0.8)' : 'rgba(0,212,255,0.2)',
                boxShadow: isDragging ? '0 0 30px rgba(0,212,255,0.3), inset 0 0 30px rgba(0,212,255,0.05)' : '0 0 0px transparent',
                scale: isDragging ? 1.02 : 1,
            }}
            transition={{ duration: 0.2 }}
            className="relative w-full"
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
                className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
          ${isDragging
                        ? 'border-cyber-primary bg-cyber-primary/10 shadow-[0_0_20px_rgba(0,212,255,0.2)]'
                        : 'border-cyber-primary/30 hover:border-cyber-primary/60 bg-cyber-darker/50'
                    }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
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
                    <div className={`
            w-16 h-16 mb-4 rounded-full flex items-center justify-center transition-all duration-300
            ${isDragging ? 'bg-cyber-primary/20 text-cyber-primary' : 'bg-cyber-darker text-cyber-primary/50 group-hover:text-cyber-primary'}
          `}>
                        {isUploading ? (
                            <div className="w-8 h-8 border-2 border-cyber-primary border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        )}
                    </div>

                    <p className="text-lg font-medium text-cyber-text mb-2">
                        {isUploading ? 'UPLOADING...' : 'INITIATE DATA UPLOAD'}
                    </p>
                    <p className="text-xs text-cyber-text/50 uppercase tracking-widest">
                        Drag & Drop PDF, DOCX, TXT, Excel
                    </p>
                </label>
            </div>

            {isUploading && (
                <div className="mt-4 px-2">
                    <div className="flex justify-between text-xs text-cyber-primary mb-1">
                        <span>UPLOADING</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1 bg-cyber-darker rounded-full overflow-hidden border border-cyber-primary/20">
                        <motion.div
                            className="h-full bg-cyber-primary shadow-[0_0_10px_rgba(0,212,255,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.1 }}
                        />
                    </div>
                </div>
            )}

            {/* Per-job status list */}
            {jobStatuses.length > 0 && (
                <div className="mt-3 space-y-1">
                    {jobStatuses.map(j => (
                        <div key={j.job_id} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${statusColor(j.status)}`}>
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
                    className={`
            mt-4 p-3 rounded-lg border text-sm flex items-center gap-2
            ${message.type === 'success'
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }
          `}
                >
                    <span>{message.type === 'success' ? '✓' : '⚠'}</span>
                    {message.text}
                </motion.div>
            )}
        </motion.div>
    );
}
