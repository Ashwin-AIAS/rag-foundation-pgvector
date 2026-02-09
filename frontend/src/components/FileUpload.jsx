import { useState } from 'react';
import { uploadFile } from '../services/api';
import './FileUpload.css';

export default function FileUpload({ onUploadSuccess }) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type)) {
            setError('Only PDF, TXT, and DOCX files are supported');
            return;
        }

        setError(null);
        setSuccessMessage(null);
        setIsUploading(true);

        try {
            const result = await uploadFile(file);
            setSuccessMessage(`✓ ${result.filename} uploaded (${result.num_chunks} chunks)`);
            onUploadSuccess(result.filename);

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsUploading(false);
            // Reset file input
            e.target.value = '';
        }
    };

    return (
        <div className="file-upload">
            <h2>Upload Documents</h2>
            <div className="upload-container">
                <label htmlFor="file-input" className={`upload-button ${isUploading ? 'disabled' : ''}`}>
                    {isUploading ? (
                        <>
                            <span className="spinner"></span>
                            Uploading...
                        </>
                    ) : (
                        'Choose File (PDF, TXT, or DOCX)'
                    )}
                </label>
                <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.txt,.docx"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    style={{ display: 'none' }}
                />
            </div>

            {successMessage && (
                <div className="success-message fade-in">
                    {successMessage}
                </div>
            )}

            {error && (
                <div className="error-message fade-in">
                    ✗ {error}
                </div>
            )}
        </div>
    );
}
