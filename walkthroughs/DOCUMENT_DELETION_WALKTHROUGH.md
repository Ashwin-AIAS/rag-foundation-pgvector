# Document Deletion Feature

I have implemented the ability to delete documents from the RAG system. This ensures that users can manage their knowledge base and remove outdated or incorrect information.

## Backend Changes

### 1. New `DocumentService` (`backend/app/services/document_service.py`)
- Created a dedicated service to handle document management.
- Implemented `delete_document` to remove chunks from the database.
- Implemented `list_documents` (moved from ingestion service).

### 2. API Endpoints (`backend/app/main.py`)
- Updated `GET /documents` to use the new service.
- Updated `DELETE /documents/{filename}` to use the new service.

## Frontend Changes

### 1. Document List (`frontend/src/App.jsx`)
- Added a list of uploaded documents.
- Added a **Delete** button next to each document.
- Implemented confirmation dialog before deletion.

### 2. API Service (`frontend/src/services/api.js`)
- Added `getDocuments()` and `deleteDocument(filename)` helper functions.

## Verification

I verified the feature using an integration test script (`test_deletion_v2.py`).
- **Upload**: Successfully uploaded a test file.
- **List**: Verified the file appeared in the list.
- **Delete**: Successfully deleted the file via API.
- **Verify**: Confirmed the file was removed from the list.

## User Action Required

To use the new feature:
1.  **Restart the backend** (already done).
2.  Refresh the frontend application.
3.  You will see a list of uploaded documents.
4.  Click **Delete** to remove a document.
