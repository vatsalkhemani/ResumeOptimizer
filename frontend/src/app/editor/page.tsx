'use client';

import { useState, useCallback, useEffect } from 'react';
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
        setSuggestions,
        setScore,
        updateBullet,
        updateMetadata,
        applySuggestion,
        dismissSuggestion
    } = useDocumentStore();

    const [isExporting, setIsExporting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [activeTab, setActiveTab] = useState<'critical' | 'stylistic' | 'formatting'>('critical');

    // Run Analysis on Mount
    useEffect(() => {
        if (resume && suggestions.length === 0 && !isAnalyzing) {
            runAnalysis();
        }
    }, [resume]); // Run once when resume is loaded

    const runAnalysis = async () => {
        if (!resume) return;
        setIsAnalyzing(true);
        try {
            // Default to empty JD string if null
            const jdText = jobDescription?.rawText || "";
            const result = await api.analyzeResume(resume, jdText);
            setScore(result.score);
            setSuggestions(result.suggestions);
        } catch (error) {
            console.error("Analysis failed:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Filter suggestions
    const filteredSuggestions = suggestions.filter(s => {
        if (s.isDismissed || s.isAccepted) return false; // Hide processed
        if (activeTab === 'critical') return s.type === 'critical';
        if (activeTab === 'stylistic') return s.type === 'stylistic';
        if (activeTab === 'formatting') return s.type === 'formatting' || s.type === 'content';
        return true;
    });

    // Suggestion Handlers
    const handleAccept = (id: string) => {
        applySuggestion(id);
    };

    const handleDismiss = (id: string) => {
        dismissSuggestion(id);
    };

    // Handle zoom
    const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

    // Handle bullet edit
    const handleBulletEdit = useCallback((sectionId: string, itemId: string, bulletId: string, newText: string) => {
        if (!resume) return;
        updateBullet(sectionId, itemId, bulletId, newText);
    }, [resume, updateBullet]);

    // Handle metadata edit
    const handleMetadataEdit = useCallback((field: string, value: string) => {
        if (!resume) return;
        updateMetadata(field as keyof typeof resume.metadata, value);
    }, [resume, updateMetadata]);

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
            console.error('PDF export failed:', error);
            alert('Failed to export PDF');
        } finally {
            setIsExporting(false);
        }
    };

    if (!resume) {
        return (
            <div className={styles.loadingContainer}>
                <p>Loading resume...</p>
                <Link href="/">Back to Upload</Link>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Top Header */}
            <header className={styles.topBar}>
                <div className={styles.fileInfo}>
                    <div className={styles.fileIcon}>📄</div>
                    <div className={styles.fileName}>
                        <span className={styles.roleName}>{resume.metadata.name || 'Resume'}</span>
                        <span className={styles.saveStatus}>Last saved just now</span>
                    </div>
                </div>

                <div className={styles.actions}>
                    <div className={styles.scoreBadge}>
                        <span className={styles.scoreLabel}>SCORE</span>
                        <span className={styles.scoreValue}>{score}%</span>
                    </div>
                    <button
                        className={styles.exportButton}
                        onClick={handleExportPdf}
                        disabled={isExporting}
                    >
                        {isExporting ? 'Exporting...' : '📥 Export PDF'}
                    </button>
                    <div className={styles.userAvatar}>👤</div>
                </div>
            </header>

            <main className={styles.mainLayout}>
                {/* Left: Canvas Area */}
                <div className={styles.canvasArea}>
                    <div
                        className={styles.resumeWrapper}
                        style={{ transform: `scale(${zoom / 100})` }}
                    >
                        <ResumePreview
                            resume={resume}
                            onBulletEdit={handleBulletEdit}
                            onMetadataEdit={handleMetadataEdit}
                        />
                    </div>

                    {/* Zoom Controls (Floating) */}
                    <div className={styles.zoomControls}>
                        <button onClick={handleZoomOut}>−</button>
                        <span>{zoom}%</span>
                        <button onClick={handleZoomIn}>+</button>
                    </div>
                </div>

                {/* Right: AI Sidebar */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <h3>AI Copilot</h3>
                        <span className={styles.suggestionCount}>{suggestions.length} Suggestions</span>
                    </div>

                    <div className={styles.scoreCard}>
                        <div className={styles.scoreRow}>
                            <span>Optimization Score</span>
                            <span className={styles.scoreHigh}>{score}%</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${score}%` }}></div>
                        </div>
                        <div className={styles.scoreStatus}>
                            {isAnalyzing ? "Analyzing resume..." : "Analysis complete."}
                        </div>
                    </div>

                    <div className={styles.tabs}>
                        <button
                            className={activeTab === 'critical' ? styles.activeTab : styles.tab}
                            onClick={() => setActiveTab('critical')}
                        >
                            Critical ({suggestions.filter(s => s.type === 'critical').length})
                        </button>
                        <button
                            className={activeTab === 'stylistic' ? styles.activeTab : styles.tab}
                            onClick={() => setActiveTab('stylistic')}
                        >
                            Stylistic ({suggestions.filter(s => s.type === 'stylistic').length})
                        </button>
                        <button
                            className={activeTab === 'formatting' ? styles.activeTab : styles.tab}
                            onClick={() => setActiveTab('formatting')}
                        >
                            Formatting
                        </button>
                    </div>

                    <div className={styles.suggestionList}>
                        {isAnalyzing && <div className={styles.loadingSuggestion}>Analyzing...</div>}

                        {!isAnalyzing && filteredSuggestions.length === 0 && (
                            <div className={styles.emptyState}>No suggestions in this category.</div>
                        )}

                        {filteredSuggestions.map(suggestion => (
                            <div key={suggestion.id} className={styles.suggestionCard}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.impactTag}>
                                        {suggestion.score_impact > 0 && `+${suggestion.score_impact} PTS`}
                                    </span>
                                    <span className={styles.sectionTag}>{suggestion.action}</span>
                                </div>
                                <h4>{suggestion.title}</h4>
                                <p>{suggestion.description}</p>

                                {(suggestion.current_text && suggestion.suggested_text) && (
                                    <div className={styles.diffBox}>
                                        <div className={styles.diffOld}>{suggestion.current_text}</div>
                                        <div className={styles.diffNew}>{suggestion.suggested_text}</div>
                                    </div>
                                )}

                                <div className={styles.cardActions}>
                                    <button
                                        className={styles.acceptButton}
                                        onClick={() => handleAccept(suggestion.id)}
                                    >
                                        ✓ Accept
                                    </button>
                                    <button
                                        className={styles.dismissButton}
                                        onClick={() => handleDismiss(suggestion.id)}
                                    >
                                        ✕ Dismiss
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chat / Prompt Input */}
                    <div className={styles.chatInputArea}>
                        <div className={styles.chatBox}>
                            <span className={styles.sparkleIcon}>✨</span>
                            <input type="text" placeholder="Ask AI to rewrite a section..." />
                            <button className={styles.sendButton}>↑</button>
                        </div>
                        <div className={styles.disclaimer}>AI can make mistakes. Please review suggestions.</div>
                    </div>
                </aside>
            </main>
        </div>
    );
}
