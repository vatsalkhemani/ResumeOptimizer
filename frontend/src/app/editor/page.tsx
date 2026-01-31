'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
        reorderSections,
        setJobDescription,
        removeBullet,
        removeSectionItem,
        addBullet,
        removeSection
    } = useDocumentStore();

    const [isExporting, setIsExporting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>('experience');
    const [categoryFilter, setCategoryFilter] = useState<'content' | 'formatting'>('content');
    const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(0.8);

    // Get active (not processed) suggestions filtered by category
    const activeSuggestions = useMemo(() =>
        suggestions.filter(s =>
            !s.isAccepted &&
            !s.isDismissed &&
            (s.category || 'content') === categoryFilter
        ),
        [suggestions, categoryFilter]
    );

    // Current suggestion being shown
    const currentSuggestion = activeSuggestions[activeSuggestionIndex] || null;

    const hasAnalyzed = useRef(false);

    // Reset index if it goes out of bounds
    useEffect(() => {
        if (activeSuggestionIndex >= activeSuggestions.length && activeSuggestions.length > 0) {
            setActiveSuggestionIndex(activeSuggestions.length - 1);
        }
    }, [activeSuggestions.length, activeSuggestionIndex, setActiveSuggestionIndex]);

    // Run Analysis on Mount (only once)
    useEffect(() => {
        if (resume && suggestions.length === 0 && !isAnalyzing && !hasAnalyzed.current) {
            hasAnalyzed.current = true;
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

    // Handle new bullet
    const handleAddBullet = useCallback((sectionId: string, itemId: string) => {
        addBullet(sectionId, itemId, "New bullet point");
    }, [addBullet]);

    // Handle section delete
    const handleSectionDelete = useCallback((sectionId: string) => {
        if (confirm('Are you sure you want to delete this section?')) {
            removeSection(sectionId);
        }
    }, [removeSection]);

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

    const handleMetadataEdit = useCallback((field: string, value: string) => {
        updateMetadata(field, value);
    }, [updateMetadata]);

    const handleBulletEdit = useCallback((sectionId: string, itemId: string, bulletId: string, text: string) => {
        updateBullet(sectionId, itemId, bulletId, text);
    }, [updateBullet]);



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
                    <div className={styles.zoomControls}>
                        <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className={styles.zoomBtn}>-</button>
                        <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className={styles.zoomBtn}>+</button>
                    </div>
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
                <div className={styles.previewPane}>
                    <div className={styles.resumeScaler} style={{ zoom: zoom }}>
                        <ResumePreview
                            resume={resume}
                            onMetadataEdit={handleMetadataEdit}
                            onBulletEdit={handleBulletEdit}
                            onBulletDelete={removeBullet}
                            onBulletAdd={handleAddBullet}
                            onItemDelete={removeSectionItem}
                            onSectionDelete={handleSectionDelete}
                            editable={true}
                            highlightedBulletId={currentSuggestion?.bullet_id}
                            highlightedItemId={currentSuggestion?.item_id}
                        />
                    </div>
                </div>
                {/* Right Sidebar */}
                <aside className={styles.sidebar}>
                    {/* Suggestion Panel */}
                    <div className={styles.suggestionPanel}>
                        <div className={styles.panelHeader}>
                            <span className={styles.panelLabel}>SUGGESTION</span>
                            <div className={styles.suggestionNav}>
                                <button
                                    className={styles.navArrow}
                                    onClick={() => setActiveSuggestionIndex(
                                        activeSuggestionIndex > 0
                                            ? activeSuggestionIndex - 1
                                            : activeSuggestions.length - 1
                                    )}
                                    disabled={activeSuggestions.length <= 1}
                                >
                                    ←
                                </button>
                                <span className={styles.suggestionCount}>
                                    {activeSuggestions.length > 0
                                        ? `${activeSuggestionIndex + 1} / ${activeSuggestions.length}`
                                        : 'None'
                                    }
                                </span>
                                <button
                                    className={styles.navArrow}
                                    onClick={() => setActiveSuggestionIndex(
                                        activeSuggestionIndex < activeSuggestions.length - 1
                                            ? activeSuggestionIndex + 1
                                            : 0
                                    )}
                                    disabled={activeSuggestions.length <= 1}
                                >
                                    →
                                </button>
                            </div>
                        </div>

                        {/* Category Toggle */}
                        <div className={styles.categoryToggle}>
                            <button
                                className={`${styles.categoryBtn} ${categoryFilter === 'content' ? styles.activeCategory : ''}`}
                                onClick={() => { setCategoryFilter('content'); setActiveSuggestionIndex(0); }}
                            >
                                Content
                            </button>
                            <button
                                className={`${styles.categoryBtn} ${categoryFilter === 'formatting' ? styles.activeCategory : ''}`}
                                onClick={() => { setCategoryFilter('formatting'); setActiveSuggestionIndex(0); }}
                            >
                                Formatting
                            </button>
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
                            </div>
                        )}

                        {/* Edit via Prompt */}

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
                                    onClick={() => {
                                        setExpandedSection(section.type);
                                        const element = document.getElementById(`section-${section.id}`);
                                        if (element) {
                                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }
                                    }}
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
        </div >
    );
}
