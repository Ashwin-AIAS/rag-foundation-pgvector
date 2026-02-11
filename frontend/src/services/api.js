// API service for backend communication
const API_BASE_URL = '';

/**
 * Upload a file to the backend ingestion endpoint
 * @param {File} file - The file to upload (PDF or TXT)
 * @returns {Promise<Object>} Upload result
 */
export async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Query the RAG system with a question
 * @param {string} question - The user's question
 * @param {number} topK - Optional: number of chunks to retrieve
 * @returns {Promise<Object>} Query result with answer and chunks
 */
export async function queryDocuments(question, topK = null) {
    const body = { question };
    if (topK !== null) {
        body.top_k = topK;
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
