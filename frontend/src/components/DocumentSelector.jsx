import { useState, useEffect } from 'react';
import { getDocuments } from '../services/api';

export default function DocumentSelector({ documents, selectedDocs, onSelectionChange }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleDoc = (filename) => {
        const next = selectedDocs.includes(filename)
            ? selectedDocs.filter(d => d !== filename)
            : [...selectedDocs, filename];
        onSelectionChange(next);
    };

    const selectAll = () => onSelectionChange([...documents]);
    const clearAll = () => onSelectionChange([]);

    if (!documents || documents.length === 0) return null;

    return (
        <div className="doc-selector">
            <button
                className="doc-selector-toggle"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <span className="doc-selector-icon">
                    {isCollapsed ? '▸' : '▾'}
                </span>
                <span className="doc-selector-title">DOCUMENT FILTER</span>
                <span className="doc-selector-badge">
                    {selectedDocs.length === 0 ? 'ALL' : `${selectedDocs.length}/${documents.length}`}
                </span>
            </button>

            {!isCollapsed && (
                <div className="doc-selector-body">
                    <div className="doc-selector-actions">
                        <button onClick={selectAll} className="doc-selector-action">Select All</button>
                        <button onClick={clearAll} className="doc-selector-action">Clear</button>
                    </div>

                        <ul className="doc-selector-list">
                            {documents.map((doc) => (
                                <li key={doc} className="doc-selector-item">
                                    <label className="doc-selector-label">
                                        <input
                                            type="checkbox"
                                            checked={selectedDocs.includes(doc)}
                                            onChange={() => toggleDoc(doc)}
                                            className="doc-selector-checkbox"
                                        />
                                        <span className="doc-selector-name">{doc}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>

                    {selectedDocs.length === 0 && (
                        <p className="doc-selector-hint">
                            No filter — querying all documents
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
