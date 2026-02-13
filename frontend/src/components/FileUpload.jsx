import { useState, useCallback } from 'react';
import { uploadFile } from '../services/api';
import { motion } from 'framer-motion';

export default function FileUpload({ onUploadSuccess }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: string }

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const processFile = async (file) => {
        if (!file) return;

        // Validate file type (expanded for DOCX)
        const validTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown'];
        const validExtensions = ['.pdf', '.txt', '.md', '.docx'];

        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

        if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
            setMessage({ type: 'error', text: 'Invalid file format. Please upload PDF, DOCX, or Text files.' });
            return;
        }

        setIsUploading(true);
        setMessage(null);

        try {
            const response = await uploadFile(file);
            setMessage({ type: 'success', text: `Systems upgraded: ${file.name} integrated successfully.` });
            if (onUploadSuccess) onUploadSuccess();
        } catch (error) {
            console.error('Upload failed:', error);
            setMessage({ type: 'error', text: 'Upload failed. Transmission interrupted.' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full"
        >
            <div
                className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
          ${isDragging
                        ? 'border-cyber-primary bg-cyber-primary/10 shadow-[0_0_20px_rgba(0,212,255,0.2)]'
                        : 'border-cyber-primary/30 hover:border-cyber-primary/60 bg-cyber-darker/50'
                    }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.txt,.md,.docx"
                    disabled={isUploading}
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
                        Drag & Drop PDF, DOCX, TXT
                    </p>
                </label>
            </div>

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
