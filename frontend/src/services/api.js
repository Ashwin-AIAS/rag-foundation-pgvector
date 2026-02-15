import axios from 'axios';

// API service for backend communication
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    console.error("VITE_API_BASE_URL is not defined! Make sure your .env file is set up correctly.");
}

/**
 * Upload a file to the backend ingestion endpoint
 * @param {File} file - The file to upload
 * @param {Function} onUploadProgress - Callback for upload progress
 * @returns {Promise<Object>} Upload result
 */
export async function uploadFile(file, onUploadProgress) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await axios.post(`${API_BASE_URL}/ingest`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onUploadProgress) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onUploadProgress(percentCompleted);
                }
            }
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            // Server responded with a status code out of 2xx range
            throw new Error(error.response.data.detail || `HTTP ${error.response.status}`);
        } else if (error.request) {
            // Request was made but no response received
            throw new Error('No response from server. Please check your connection.');
        } else {
            // Something happened in setting up the request
            throw new Error(error.message);
        }
    }
}

/**
 * Query the RAG system with a question
 * @param {string} question - The user's question
 * @param {number} topK - Optional: number of chunks to retrieve
 * @param {string[]} selectedDocuments - Optional: filter to these source files
 * @returns {Promise<Object>} Query result with answer and chunks
 */
export async function queryDocuments(question, topK = null, selectedDocuments = []) {
    const body = { question };
    if (topK !== null) {
        body.top_k = topK;
    }
    if (selectedDocuments && selectedDocuments.length > 0) {
        body.selected_documents = selectedDocuments;
    }

    const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Query failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Stream a query to the RAG system with robust error handling
 * @param {string} question - The user's question
 * @param {function} onUpdate - Callback for full text updates
 * @param {AbortSignal} signal - Optional AbortSignal for cancellation
 * @returns {Promise<string>} Full generated text
 */
export async function streamQuery(question, onUpdate, signal = null, selectedDocuments = []) {
    const body = { question };
    if (selectedDocuments && selectedDocuments.length > 0) {
        body.selected_documents = selectedDocuments;
    }

    const fetchOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    };

    if (signal) {
        fetchOptions.signal = signal;
    }

    const response = await fetch(`${API_BASE_URL}/query?stream=true`, fetchOptions);

    if (!response.ok) {
        throw new Error(`Streaming failed: HTTP ${response.status}`);
    }

    if (!response.body) {
        throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;

            if (onUpdate) {
                onUpdate(fullText);
            }
        }
    } catch (error) {
        // If aborted, cancel the reader and rethrow
        if (signal?.aborted) {
            try { reader.cancel(); } catch (_) { }
            throw new DOMException('Aborted', 'AbortError');
        }
        console.error("Error reading stream:", error);
        throw error;
    }

    return fullText;
}

/**
 * Get list of all uploaded documents
 * @returns {Promise<Object>} List of documents
 */
export async function getDocuments() {
    const response = await fetch(`${API_BASE_URL}/documents`);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Delete a document by filename
 * @param {string} filename - Name of file to delete
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteDocument(filename) {
    const response = await fetch(`${API_BASE_URL}/documents/${filename}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Deletion failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Submit feedback for a generated answer
 * @param {Object} feedbackData - Feedback payload
 * @returns {Promise<Object>} Feedback submission result
 */
export async function submitFeedback(feedbackData) {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Feedback submission failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}
