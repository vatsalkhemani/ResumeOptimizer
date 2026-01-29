/**
 * API Client for Resume Optimizer backend
 * 
 * Architecture:
 * - Parse: Upload file → get Resume model
 * - Export PDF: Send Resume model → get PDF blob (for download)
 * - Preview: Rendered directly in frontend (no API call needed)
 */
import { Resume, ParseResponse } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Parse a resume file (PDF or DOCX)
     * Returns the structured Resume model
     */
    async parseResume(file: File): Promise<ParseResponse> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseUrl}/api/parse`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || 'Failed to parse resume');
        }

        return response.json();
    }

    /**
     * Export resume to PDF
     * Returns the PDF as a Blob for download
     */
    async exportPdf(resume: Resume): Promise<Blob> {
        const response = await fetch(`${this.baseUrl}/api/render/pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ resume }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || 'Failed to generate PDF');
        }

        return response.blob();
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<{ status: string }> {
        const response = await fetch(`${this.baseUrl}/health`);
        return response.json();
    }
}

export const api = new ApiClient(API_BASE);
