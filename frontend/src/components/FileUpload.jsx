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

    const [uploadProgress, setUploadProgress] = useState(0);

    const processFiles = async (files) => {
        if (!files || files.length === 0) return;

        // Validate file type (expanded for DOCX, Excel, CSV)
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
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            return validTypes.includes(file.type) || validExtensions.includes(fileExtension);
        });

        if (validFiles.length === 0) {
            setMessage({ type: 'error', text: 'No valid files selected. Supported: PDF, DOCX, TXT, CSV, Excel.' });
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setMessage(null);

        try {
            await uploadFile(validFiles, (percent) => {
                setUploadProgress(percent);
            });
            setMessage({ type: 'success', text: `Systems upgraded: ${validFiles.length} file(s) integrated successfully.` });
            if (onUploadSuccess) onUploadSuccess();
        } catch (error) {
            console.log("Upload error:", error);
            
            let errorText = "Upload failed. Unknown error.";
            if (error.response && error.response.data) {
                errorText = typeof error.response.data === 'string' 
                    ? error.response.data 
                    : JSON.stringify(error.response.data);
            } else if (error.message) {
                errorText = error.message;
            }
            
            setMessage({ type: 'error', text: errorText });
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    }, []);

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
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
