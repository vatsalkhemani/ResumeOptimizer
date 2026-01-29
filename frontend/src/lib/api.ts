/**
 * API Client for Resume Optimizer backend
 */
import { Resume, ParseResponse, RenderResponse } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Parse a resume file (PDF or DOCX)
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
     * Render resume to LaTeX and compile to PDF
     */
    async renderResume(resume: Resume): Promise<RenderResponse> {
        const response = await fetch(`${this.baseUrl}/api/render`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ resume }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || 'Failed to render resume');
        }

        return response.json();
    }

    /**
     * Get LaTeX source only (without PDF compilation)
     */
    async getLatexSource(resume: Resume): Promise<{ latex: string }> {
        const response = await fetch(`${this.baseUrl}/api/render/latex`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ resume }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || 'Failed to get LaTeX source');
        }

        return response.json();
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
