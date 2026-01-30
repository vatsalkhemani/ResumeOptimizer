'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import { useDocumentStore } from '@/lib/store';
import ResumePreview from '@/components/ResumePreview';
import { api } from '@/lib/api';

export default function EditorPage() {
    const router = useRouter();
    const {
        resume,
        suggestions,
        score,
        jobDescription,
        activeSuggestionIndex,
        setSuggestions,
        setScore,
        updateBullet,
        updateMetadata,
        applySuggestion,
        dismissSuggestion,
        nextSuggestion,
        setActiveSuggestionIndex,
        reorderSections
    } = useDocumentStore();

    const [isExporting, setIsExporting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');
    const [expandedSection, setExpandedSection] = useState<string | null>('experience');
    const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);

    // Get active (not processed) suggestions
    const activeSuggestions = useMemo(() =>
        suggestions.filter(s => !s.isAccepted && !s.isDismissed),
        [suggestions]
    );

    // Current suggestion being shown
    const currentSuggestion = activeSuggestions[activeSuggestionIndex] || null;

    // Run Analysis on Mount
    useEffect(() => {
        if (resume && suggestions.length === 0 && !isAnalyzing) {
            runAnalysis();
        }
    }, [resume]);

    const runAnalysis = async () => {
        if (!resume) return;
        setIsAnalyzing(true);
        try {
            const jdText = jobDescription?.rawText || "";
            const result = await api.analyzeResume(resume, jdText);
            setScore(result.score);
            setSuggestions(result.suggestions);
            setActiveSuggestionIndex(0);
        } catch (error) {
            console.error("Analysis failed:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Handle approve
    const handleApprove = () => {
        if (!currentSuggestion) return;
        applySuggestion(currentSuggestion.id);
        // Auto-advance to next suggestion (index stays same since array shrinks)
    };

    // Handle discard
    const handleDiscard = () => {
        if (!currentSuggestion) return;
        dismissSuggestion(currentSuggestion.id);
    };

    // Handle custom prompt submit
    const handleCustomPrompt = async () => {
        if (!customPrompt.trim() || !resume) return;
        // TODO: Implement custom AI edit
        console.log("Custom prompt:", customPrompt);
        setCustomPrompt('');
    };

    // Export to PDF
    const handleExportPdf = async () => {
        if (!resume) return;
        setIsExporting(true);
        try {
            const pdfBlob = await api.exportPdf(resume);
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${resume.metadata.name.replace(/\s+/g, '_')}_Resume.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setIsExporting(false);
        }
    };

    // Drag and drop handlers for section reordering
    const handleDragStart = (sectionId: string) => {
        setDraggedSectionId(sectionId);
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedSectionId || draggedSectionId === targetId) return;
    };

    const handleDrop = (targetId: string) => {
        if (!draggedSectionId || draggedSectionId === targetId) return;

        const currentSections = [...sections].sort((a, b) => a.order - b.order);
        const draggedIndex = currentSections.findIndex(s => s.id === draggedSectionId);
        const targetIndex = currentSections.findIndex(s => s.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        // Reorder: remove dragged item and insert at target position
        const [draggedSection] = currentSections.splice(draggedIndex, 1);
        currentSections.splice(targetIndex, 0, draggedSection);

        // Update with new order
        reorderSections(currentSections.map(s => s.id));
        setDraggedSectionId(null);
    };

    const handleDragEnd = () => {
        setDraggedSectionId(null);
    };

    // Get highlighted bullet ID from current suggestion
    // For ADD suggestions, we highlight the item instead
    const highlightedBulletId = currentSuggestion?.bullet_id || null;
    const highlightedItemId = currentSuggestion?.action === 'add' ? currentSuggestion?.item_id : null;

    // Section list for manager (sorted by order)
    const sections = resume?.sections ? [...resume.sections].sort((a, b) => a.order - b.order) : [];



    if (!resume) {
        return (
            <div className={styles.loadingContainer}>
                <p>No resume loaded. <Link href="/">Go back</Link></p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Top Bar */}
            <header className={styles.topBar}>
                <div className={styles.fileInfo}>
                    <Link href="/" className={styles.backButton}>←</Link>
                    <div className={styles.fileName}>
                        <span className={styles.roleName}>{resume.metadata.name || 'Untitled'}</span>
                        <span className={styles.saveStatus}>All changes saved</span>
                    </div>
                </div>
                <div className={styles.actions}>
                    <button
                        className={styles.exportButton}
                        onClick={handleExportPdf}
                        disabled={isExporting}
                    >
                        {isExporting ? 'Exporting...' : 'Export PDF'}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.mainArea}>
                {/* Document Preview */}
                <section className={styles.previewPane}>
                    <ResumePreview
                        resume={resume}
                        highlightedBulletId={highlightedBulletId}
                        highlightedItemId={highlightedItemId}
                    />
                </section>

                {/* Right Sidebar */}
                <aside className={styles.sidebar}>
                    {/* Suggestion Panel */}
                    <div className={styles.suggestionPanel}>
                        <div className={styles.panelHeader}>
                            <span className={styles.panelLabel}>SUGGESTION</span>
                            <span className={styles.suggestionCount}>
                                {activeSuggestions.length > 0
                                    ? `${activeSuggestionIndex + 1} of ${activeSuggestions.length}`
                                    : '—'
                                }
                            </span>
                        </div>

                        {isAnalyzing ? (
                            <div className={styles.analyzingState}>
                                <div className={styles.spinner}></div>
                                <p>Analyzing your resume...</p>
                            </div>
                        ) : currentSuggestion ? (
                            <div className={styles.suggestionContent}>
                                <h3 className={styles.suggestionTitle}>
                                    {currentSuggestion.title}
                                </h3>

                                {currentSuggestion.current_text && (
                                    <div className={styles.textBlock}>
                                        <label>Current Text</label>
                                        <p className={styles.currentText}>
                                            {currentSuggestion.current_text}
                                        </p>
                                    </div>
                                )}

                                {currentSuggestion.suggested_text && (
                                    <div className={styles.textBlock}>
                                        <label>Proposed Text</label>
                                        <p className={styles.proposedText}>
                                            {currentSuggestion.suggested_text}
                                        </p>
                                    </div>
                                )}

                                <div className={styles.actionButtons}>
                                    <button
                                        className={styles.approveButton}
                                        onClick={handleApprove}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        className={styles.discardButton}
                                        onClick={handleDiscard}
                                    >
                                        Discard
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.noSuggestions}>
                                <p>✓ All suggestions reviewed!</p>
                                <p className={styles.scoreDisplay}>ATS Score: {score}%</p>
                            </div>
                        )}
                    </div>

                    {/* Custom Edit Input */}
                    <div className={styles.customEditSection}>
                        <label className={styles.sectionLabel}>CUSTOM EDIT</label>
                        <div className={styles.customEditBox}>
                            <input
                                type="text"
                                placeholder="Reword, add metrics, reorder..."
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCustomPrompt()}
                            />
                            <button
                                className={styles.sendButton}
                                onClick={handleCustomPrompt}
                                disabled={!customPrompt.trim()}
                            >
                                →
                            </button>
                        </div>
                    </div>

                    {/* Section Manager */}
                    <div className={styles.sectionManager}>
                        <label className={styles.sectionLabel}>SECTION MANAGER</label>
                        <p className={styles.sectionHint}>Drag to reorder</p>
                        <div className={styles.sectionList}>
                            {sections.map(section => (
                                <div
                                    key={section.id}
                                    className={`${styles.sectionItem} ${expandedSection === section.type ? styles.activeSection : ''} ${draggedSectionId === section.id ? styles.dragging : ''}`}
                                    draggable
                                    onDragStart={() => handleDragStart(section.id)}
                                    onDragOver={(e) => handleDragOver(e, section.id)}
                                    onDrop={() => handleDrop(section.id)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => setExpandedSection(section.type)}
                                >
                                    <span className={styles.dragHandle}>⋮⋮</span>
                                    <span className={styles.sectionTitle}>{section.title}</span>
                                    <span className={styles.chevron}>›</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </main>

            {/* Bottom Score Bar */}
            <footer className={styles.bottomBar}>
                <div className={styles.scoreIndicator}>
                    <span className={styles.scoreValue}>{score}%</span>
                </div>
            </footer>
        </div>
    );
}
