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
    const { resume, updateBullet, updateMetadata } = useDocumentStore();
    const [isExporting, setIsExporting] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [activeTab, setActiveTab] = useState<'critical' | 'stylistic' | 'formatting'>('critical');

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
                        <span className={styles.scoreValue}>85%</span>
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
                            editable={true}
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
                        <span className={styles.suggestionCount}>12 Suggestions</span>
                    </div>

                    <div className={styles.scoreCard}>
                        <div className={styles.scoreRow}>
                            <span>Optimization Score</span>
                            <span className={styles.scoreHigh}>85%</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: '85%' }}></div>
                        </div>
                        <div className={styles.scoreStatus}>
                            ✓ Great job! Resume is ATS-friendly.
                        </div>
                    </div>

                    <div className={styles.tabs}>
                        <button
                            className={activeTab === 'critical' ? styles.activeTab : styles.tab}
                            onClick={() => setActiveTab('critical')}
                        >
                            Critical (3)
                        </button>
                        <button
                            className={activeTab === 'stylistic' ? styles.activeTab : styles.tab}
                            onClick={() => setActiveTab('stylistic')}
                        >
                            Stylistic (5)
                        </button>
                        <button
                            className={activeTab === 'formatting' ? styles.activeTab : styles.tab}
                            onClick={() => setActiveTab('formatting')}
                        >
                            Formatting (4)
                        </button>
                    </div>

                    <div className={styles.suggestionList}>
                        {/* Mock Suggestion Card */}
                        <div className={styles.suggestionCard}>
                            <div className={styles.cardHeader}>
                                <span className={styles.impactTag}>⚡ IMPACT</span>
                                <span className={styles.sectionTag}>Summary</span>
                            </div>
                            <h4>Strengthen Action Verbs</h4>
                            <p>Replace passive language with strong action verbs to emphasize your leadership role.</p>

                            <div className={styles.diffBox}>
                                <div className={styles.diffOld}>...track record of managing cross-functional teams...</div>
                                <div className={styles.diffNew}>...track record of <strong>leading</strong> cross-functional teams...</div>
                            </div>

                            <div className={styles.cardActions}>
                                <button className={styles.acceptButton}>✓ Accept</button>
                                <button className={styles.dismissButton}>✕ Dismiss</button>
                            </div>
                        </div>

                        <div className={styles.suggestionCard}>
                            <div className={styles.cardHeader}>
                                <span className={styles.missingTag}>❗ MISSING KEYWORD</span>
                                <span className={styles.sectionTag}>Skills</span>
                            </div>
                            <h4>Add "Product Strategy"</h4>
                            <p>This keyword appears in 80% of job descriptions for this role but is missing/hidden.</p>
                            <button className={styles.addButton}>Add to Skills</button>
                        </div>
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
