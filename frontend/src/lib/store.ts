/**
 * Resume Optimizer - Zustand Store
 * Manages resume state with undo/redo support
 */
import { create } from 'zustand';
import { Resume, Suggestion, JobDescription, ResumeSection } from './types';

interface DocumentState {
    // Core state
    resume: Resume | null;
    suggestions: Suggestion[];
    jobDescription: JobDescription | null;

    // PDF state
    pdfBase64: string | null;
    htmlSource: string | null;

    // AI Metrics
    score: number;

    // UI state
    isLoading: boolean;
    error: string | null;
    selectedSuggestionId: string | null;

    // History for undo/redo
    history: Resume[];
    future: Resume[];

    // Actions
    setResume: (resume: Resume) => void;
    setPdf: (pdfBase64: string, html: string) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setJobDescription: (jd: JobDescription | null) => void;
    setSuggestions: (suggestions: Suggestion[]) => void;
    setScore: (score: number) => void;
    setSelectedSuggestion: (id: string | null) => void;

    // Resume mutations
    updateMetadata: (field: string, value: string) => void;
    updateBullet: (sectionId: string, itemId: string, bulletId: string, text: string) => void;
    addSection: (section: ResumeSection) => void;
    removeSection: (sectionId: string) => void;
    reorderSections: (sectionIds: string[]) => void;

    // Suggestion actions
    applySuggestion: (suggestionId: string) => void;
    dismissSuggestion: (suggestionId: string) => void;

    // History actions
    undo: () => void;
    redo: () => void;

    // Reset
    reset: () => void;
}

const initialState = {
    resume: null,
    score: 0,
    suggestions: [],
    jobDescription: null,
    pdfBase64: null,
    htmlSource: null,
    isLoading: false,
    error: null,
    selectedSuggestionId: null,
    history: [],
    future: [],
};

export const useDocumentStore = create<DocumentState>((set, get) => ({
    ...initialState,

    setResume: (resume) => {
        const current = get().resume;
        set({
            resume,
            history: current ? [...get().history, current] : get().history,
            future: [], // Clear redo stack on new change
        });
    },

    setPdf: (pdfBase64, html) => set({ pdfBase64, htmlSource: html }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    setJobDescription: (jd) => set({ jobDescription: jd }),

    setSuggestions: (suggestions) => set({ suggestions }),

    setScore: (score) => set({ score }),

    setSelectedSuggestion: (id) => set({ selectedSuggestionId: id }),

    updateMetadata: (field, value) => {
        const resume = get().resume;
        if (!resume) return;

        const current = get().resume;
        const updated = {
            ...resume,
            metadata: { ...resume.metadata, [field]: value },
            updated_at: new Date().toISOString(),
        };

        set({
            resume: updated,
            history: current ? [...get().history, current] : get().history,
            future: [],
        });
    },

    updateBullet: (sectionId, itemId, bulletId, text) => {
        const resume = get().resume;
        if (!resume) return;

        const current = get().resume;
        const updated = {
            ...resume,
            sections: resume.sections.map(section => {
                if (section.id !== sectionId) return section;
                return {
                    ...section,
                    items: section.items.map(item => {
                        if (item.id !== itemId) return item;
                        const content = item.content;
                        if ('bullets' in content) {
                            return {
                                ...item,
                                content: {
                                    ...content,
                                    bullets: content.bullets.map(bullet =>
                                        bullet.id === bulletId ? { ...bullet, text } : bullet
                                    ),
                                },
                            };
                        }
                        return item;
                    }),
                };
            }),
            updated_at: new Date().toISOString(),
        };

        set({
            resume: updated,
            history: current ? [...get().history, current] : get().history,
            future: [],
        });
    },

    addSection: (section) => {
        const resume = get().resume;
        if (!resume) return;

        const current = get().resume;
        const updated = {
            ...resume,
            sections: [...resume.sections, section],
            updated_at: new Date().toISOString(),
        };

        set({
            resume: updated,
            history: current ? [...get().history, current] : get().history,
            future: [],
        });
    },

    removeSection: (sectionId) => {
        const resume = get().resume;
        if (!resume) return;

        const current = get().resume;
        const updated = {
            ...resume,
            sections: resume.sections.filter(s => s.id !== sectionId),
            updated_at: new Date().toISOString(),
        };

        set({
            resume: updated,
            history: current ? [...get().history, current] : get().history,
            future: [],
        });
    },

    reorderSections: (sectionIds) => {
        const resume = get().resume;
        if (!resume) return;

        const current = get().resume;
        const sectionMap = new Map(resume.sections.map(s => [s.id, s]));
        const updated = {
            ...resume,
            sections: sectionIds.map((id, index) => ({
                ...sectionMap.get(id)!,
                order: index,
            })),
            updated_at: new Date().toISOString(),
        };

        set({
            resume: updated,
            history: current ? [...get().history, current] : get().history,
            future: [],
        });
    },

    applySuggestion: (suggestionId) => {
        const { suggestions, updateBullet } = get();
        const suggestion = suggestions.find(s => s.id === suggestionId);

        if (!suggestion) return;

        // Handle Bullet Rewrite
        if (suggestion.section_id && suggestion.item_id && suggestion.bullet_id && suggestion.suggested_text) {
            updateBullet(suggestion.section_id, suggestion.item_id, suggestion.bullet_id, suggestion.suggested_text);
        }

        // Mark as accepted locally
        set({
            suggestions: suggestions.map(s =>
                s.id === suggestionId ? { ...s, isAccepted: true } : s
            ),
        });
    },

    dismissSuggestion: (suggestionId) => {
        set({
            suggestions: get().suggestions.map(s =>
                s.id === suggestionId ? { ...s, status: 'dismissed' as const } : s
            ),
        });
    },

    undo: () => {
        const { history, resume } = get();
        if (history.length === 0) return;

        const previous = history[history.length - 1];
        const newHistory = history.slice(0, -1);

        set({
            resume: previous,
            history: newHistory,
            future: resume ? [resume, ...get().future] : get().future,
        });
    },

    redo: () => {
        const { future, resume } = get();
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        set({
            resume: next,
            history: resume ? [...get().history, resume] : get().history,
            future: newFuture,
        });
    },

    reset: () => set(initialState),
}));
