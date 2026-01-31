/**
 * Resume Optimizer - Zustand Store
 * Manages resume state with undo/redo support
 */
import { create } from 'zustand';
import { Resume, Suggestion, JobDescription, ResumeSection, Keyword } from './types';

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
    matchScore: number;
    keywords: Keyword[];

    // UI state
    isLoading: boolean;
    error: string | null;
    selectedSuggestionId: string | null;
    activeSuggestionIndex: number; // For single-suggestion view

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
    setMatchScore: (score: number) => void;
    setKeywords: (keywords: Keyword[]) => void;
    setSelectedSuggestion: (id: string | null) => void;
    setActiveSuggestionIndex: (index: number) => void;

    // Resume mutations
    updateMetadata: (field: string, value: string) => void;
    updateBullet: (sectionId: string, itemId: string, bulletId: string, text: string) => void;
    addBullet: (sectionId: string, itemId: string, text: string) => void;
    removeBullet: (sectionId: string, itemId: string, bulletId: string) => void;
    addSection: (section: ResumeSection) => void;
    removeSection: (sectionId: string) => void;
    removeSectionItem: (sectionId: string, itemId: string) => void;
    reorderSections: (sectionIds: string[]) => void;

    // Suggestion actions
    applySuggestion: (suggestionId: string) => void;
    dismissSuggestion: (suggestionId: string) => void;
    nextSuggestion: () => void;
    prevSuggestion: () => void;

    // History actions
    undo: () => void;
    redo: () => void;

    // Reset
    reset: () => void;
}

const initialState = {
    resume: null,
    score: 0,
    matchScore: 0,
    keywords: [],
    suggestions: [],
    jobDescription: null,
    pdfBase64: null,
    htmlSource: null,
    isLoading: false,
    error: null,
    selectedSuggestionId: null,
    activeSuggestionIndex: 0,
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
    setMatchScore: (score) => set({ matchScore: score }),
    setKeywords: (keywords) => set({ keywords }),

    setSelectedSuggestion: (id) => set({ selectedSuggestionId: id }),

    setActiveSuggestionIndex: (index) => set({ activeSuggestionIndex: index }),

    nextSuggestion: () => {
        const { activeSuggestionIndex, suggestions } = get();
        const activeSuggestions = suggestions.filter(s => !s.isAccepted && !s.isDismissed);
        if (activeSuggestions.length === 0) return;
        const nextIndex = (activeSuggestionIndex + 1) % activeSuggestions.length;
        set({ activeSuggestionIndex: nextIndex });
    },

    prevSuggestion: () => {
        const { activeSuggestionIndex, suggestions } = get();
        const activeSuggestions = suggestions.filter(s => !s.isAccepted && !s.isDismissed);
        if (activeSuggestions.length === 0) return;
        const prevIndex = activeSuggestionIndex === 0 ? activeSuggestions.length - 1 : activeSuggestionIndex - 1;
        set({ activeSuggestionIndex: prevIndex });
    },

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

    addBullet: (sectionId, itemId, text) => {
        const resume = get().resume;
        if (!resume) return;

        const current = get().resume;
        const newBulletId = `bullet-${Date.now()}`;

        const updated = {
            ...resume,
            sections: resume.sections.map(section => {
                if (section.id !== sectionId) return section;
                return {
                    ...section,
                    items: section.items.map(item => {
                        if (item.id !== itemId) return item;
                        const content = item.content as any;
                        if (!content.bullets) return item;

                        const maxOrder = content.bullets.length > 0
                            ? Math.max(...content.bullets.map((b: any) => b.order))
                            : -1;

                        return {
                            ...item,
                            content: {
                                ...content,
                                bullets: [
                                    ...content.bullets,
                                    { id: newBulletId, text, order: maxOrder + 1 }
                                ],
                            },
                        };
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

    removeBullet: (sectionId, itemId, bulletId) => {
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
                        const content = item.content as any;
                        if (!content.bullets) return item;
                        return {
                            ...item,
                            content: {
                                ...content,
                                bullets: content.bullets.filter((b: any) => b.id !== bulletId)
                            }
                        };
                    })
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

    removeSectionItem: (sectionId, itemId) => {
        const resume = get().resume;
        if (!resume) return;

        const current = get().resume;
        const updated = {
            ...resume,
            sections: resume.sections.map(section => {
                if (section.id !== sectionId) return section;
                return {
                    ...section,
                    items: section.items.filter(item => item.id !== itemId)
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
        const { suggestions, resume, updateBullet, addBullet } = get();
        const suggestion = suggestions.find(s => s.id === suggestionId);

        if (!suggestion || !resume) return;

        // Find the section to determine its type
        const section = resume.sections.find(s => s.id === suggestion.section_id);
        const sectionType = section?.type;

        // Handle Skills sections specially
        if (sectionType === 'skills' && suggestion.action === 'add' && suggestion.suggested_text) {
            // For skills, add to the first category's skills array
            const updated = {
                ...resume,
                sections: resume.sections.map(sec => {
                    if (sec.id !== suggestion.section_id) return sec;
                    return {
                        ...sec,
                        items: sec.items.map((item, idx) => {
                            if (idx !== 0) return item; // Only modify first item
                            const content = item.content as any;
                            if (content.type !== 'skills' || !content.categories?.length) return item;
                            // Add skill to first category
                            return {
                                ...item,
                                content: {
                                    ...content,
                                    categories: content.categories.map((cat: any, catIdx: number) => {
                                        if (catIdx !== 0) return cat;
                                        return {
                                            ...cat,
                                            skills: [...cat.skills, suggestion.suggested_text]
                                        };
                                    })
                                }
                            };
                        })
                    };
                }),
                updated_at: new Date().toISOString(),
            };
            set({ resume: updated, history: [...get().history, resume], future: [] });
        }
        // Handle ADD action for bullet-based sections
        else if (suggestion.action === 'add' && suggestion.section_id && suggestion.item_id && suggestion.suggested_text) {
            addBullet(suggestion.section_id, suggestion.item_id, suggestion.suggested_text);
        }
        // Handle DELETE action
        else if (suggestion.action === 'delete') {
            // We need to fetch the latest remove functions as they might not be in the initial destructure
            const { removeBullet, removeSectionItem } = get();
            if (suggestion.section_id && suggestion.item_id && suggestion.bullet_id) {
                removeBullet(suggestion.section_id, suggestion.item_id, suggestion.bullet_id);
            } else if (suggestion.section_id && suggestion.item_id) {
                removeSectionItem(suggestion.section_id, suggestion.item_id);
            }
        }
        // Handle REWRITE action
        else if (suggestion.section_id && suggestion.item_id && suggestion.bullet_id && suggestion.suggested_text) {
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
                s.id === suggestionId ? { ...s, isDismissed: true } : s
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
