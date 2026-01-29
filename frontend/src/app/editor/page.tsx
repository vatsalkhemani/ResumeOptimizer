'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import { useDocumentStore } from '@/lib/store';
import { api } from '@/lib/api';
import {
    ExperienceItem,
    EducationItem,
    SkillsItem,
    SummaryItem,
    ResumeSection
} from '@/lib/types';

export default function EditorPage() {
    const router = useRouter();
    const { resume, pdfBase64, setResume, setPdf, updateMetadata, updateBullet } = useDocumentStore();

    const [activeTab, setActiveTab] = useState<'edit' | 'suggestions'>('edit');
    const [zoom, setZoom] = useState(100);
    const [isRendering, setIsRendering] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Redirect if no resume loaded
    useEffect(() => {
        if (!resume) {
            router.push('/');
        }
    }, [resume, router]);

    // Re-render PDF when resume changes
    useEffect(() => {
        if (!resume) return;

        const renderTimeout = setTimeout(async () => {
            setIsRendering(true);
            try {
                const response = await api.renderResume(resume);
                setPdf(response.pdf_base64, response.latex);
                setLastSaved(new Date());
            } catch (error) {
                console.error('Failed to render PDF:', error);
            } finally {
                setIsRendering(false);
            }
        }, 500); // Debounce

        return () => clearTimeout(renderTimeout);
    }, [resume, setPdf]);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

    const handleExport = () => {
        if (!pdfBase64) return;

        // Convert base64 to blob and download
        const byteCharacters = atob(pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${resume?.metadata.name || 'resume'}_optimized.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!resume) {
        return (
            <div className={styles.editorContainer}>
                <div className={styles.emptyState}>
                    <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <p>No resume loaded</p>
                    <Link href="/" className={styles.backLink}>
                        ← Upload a resume
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.editorContainer}>
            {/* Left Panel - PDF Preview */}
            <div className={styles.previewPanel}>
                <div className={styles.previewHeader}>
                    <div className={styles.previewTitle}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                        Resume Preview
                        {isRendering && <span className="spinner" style={{ width: 14, height: 14 }} />}
                    </div>

                    {lastSaved && (
                        <div className={styles.autoSaved}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                            Auto-saved
                        </div>
                    )}

                    <div className={styles.previewControls}>
                        <div className={styles.zoomControls}>
                            <button className={styles.zoomBtn} onClick={handleZoomOut}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </button>
                            <span className={styles.zoomLevel}>{zoom}%</span>
                            <button className={styles.zoomBtn} onClick={handleZoomIn}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.previewContent}>
                    {pdfBase64 ? (
                        <div className={styles.pdfContainer} style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
                            <embed
                                src={`data:application/pdf;base64,${pdfBase64}`}
                                type="application/pdf"
                                width="612"
                                height="792"
                                style={{ display: 'block' }}
                            />
                        </div>
                    ) : (
                        <div className={styles.noPdfMessage}>
                            <svg className={styles.noPdfIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <p>PDF preview requires LaTeX installation</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                                Edit your resume on the right panel
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Sidebar */}
            <div className={styles.sidebarPanel}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.sidebarTabs}>
                        <button
                            className={`${styles.sidebarTab} ${activeTab === 'edit' ? styles.sidebarTabActive : ''}`}
                            onClick={() => setActiveTab('edit')}
                        >
                            Edit Resume
                        </button>
                        <button
                            className={`${styles.sidebarTab} ${activeTab === 'suggestions' ? styles.sidebarTabActive : ''}`}
                            onClick={() => setActiveTab('suggestions')}
                        >
                            AI Suggestions
                        </button>
                    </div>
                </div>

                <div className={styles.sidebarContent}>
                    {activeTab === 'edit' ? (
                        <div className={styles.resumeEditor}>
                            {/* Contact Info Section */}
                            <div className={styles.editorSection}>
                                <div className={styles.sectionHeader}>
                                    <span className={styles.sectionTitle}>Contact Information</span>
                                </div>
                                <div className={styles.sectionContent}>
                                    <div className={styles.metadataGrid}>
                                        <div className={`${styles.metadataField} ${styles.metadataFieldFull}`}>
                                            <label className={styles.fieldLabel}>Full Name</label>
                                            <input
                                                className={styles.fieldInput}
                                                value={resume.metadata.name}
                                                onChange={(e) => updateMetadata('name', e.target.value)}
                                            />
                                        </div>
                                        <div className={styles.metadataField}>
                                            <label className={styles.fieldLabel}>Email</label>
                                            <input
                                                className={styles.fieldInput}
                                                value={resume.metadata.email || ''}
                                                onChange={(e) => updateMetadata('email', e.target.value)}
                                            />
                                        </div>
                                        <div className={styles.metadataField}>
                                            <label className={styles.fieldLabel}>Phone</label>
                                            <input
                                                className={styles.fieldInput}
                                                value={resume.metadata.phone || ''}
                                                onChange={(e) => updateMetadata('phone', e.target.value)}
                                            />
                                        </div>
                                        <div className={styles.metadataField}>
                                            <label className={styles.fieldLabel}>Location</label>
                                            <input
                                                className={styles.fieldInput}
                                                value={resume.metadata.location || ''}
                                                onChange={(e) => updateMetadata('location', e.target.value)}
                                            />
                                        </div>
                                        <div className={styles.metadataField}>
                                            <label className={styles.fieldLabel}>LinkedIn</label>
                                            <input
                                                className={styles.fieldInput}
                                                value={resume.metadata.linkedin || ''}
                                                onChange={(e) => updateMetadata('linkedin', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Render each section */}
                            {resume.sections
                                .sort((a, b) => a.order - b.order)
                                .map((section) => (
                                    <SectionEditor
                                        key={section.id}
                                        section={section}
                                        onUpdateBullet={updateBullet}
                                    />
                                ))
                            }
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <p>AI Suggestions coming in Phase 2</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                                Paste a job description to get started
                            </p>
                        </div>
                    )}
                </div>

                <div className={styles.sidebarFooter}>
                    <button className={styles.exportBtn} onClick={handleExport} disabled={!pdfBase64}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download PDF
                    </button>
                    <Link href="/" className={styles.secondaryBtn}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}

// Section Editor Component
function SectionEditor({
    section,
    onUpdateBullet
}: {
    section: ResumeSection;
    onUpdateBullet: (sectionId: string, itemId: string, bulletId: string, text: string) => void;
}) {
    return (
        <div className={styles.editorSection}>
            <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>{section.title}</span>
            </div>
            <div className={styles.sectionContent}>
                {section.items.map((item) => {
                    const content = item.content;

                    if (content.type === 'experience') {
                        const exp = content as ExperienceItem;
                        return (
                            <div key={item.id} className={styles.itemCard}>
                                <div className={styles.itemHeader}>
                                    <div>
                                        <div className={styles.itemTitle}>{exp.role}</div>
                                        <div className={styles.itemSubtitle}>{exp.company}</div>
                                    </div>
                                    <div className={styles.itemDate}>
                                        {exp.start_date} — {exp.end_date || 'Present'}
                                    </div>
                                </div>
                                {exp.bullets.length > 0 && (
                                    <ul className={styles.bulletList}>
                                        {exp.bullets.map((bullet) => (
                                            <li key={bullet.id} className={styles.bulletItem}>
                                                <input
                                                    className={styles.bulletInput}
                                                    value={bullet.text}
                                                    onChange={(e) => onUpdateBullet(section.id, item.id, bullet.id, e.target.value)}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    }

                    if (content.type === 'education') {
                        const edu = content as EducationItem;
                        return (
                            <div key={item.id} className={styles.itemCard}>
                                <div className={styles.itemHeader}>
                                    <div>
                                        <div className={styles.itemTitle}>{edu.institution}</div>
                                        <div className={styles.itemSubtitle}>
                                            {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                                        </div>
                                    </div>
                                    <div className={styles.itemDate}>{edu.end_date}</div>
                                </div>
                            </div>
                        );
                    }

                    if (content.type === 'skills') {
                        const skills = content as SkillsItem;
                        return (
                            <div key={item.id}>
                                {skills.categories.map((cat, idx) => (
                                    <div key={idx} className={styles.skillCategory}>
                                        <div className={styles.skillCategoryName}>{cat.name}</div>
                                        <div className={styles.skillTags}>
                                            {cat.skills.map((skill, sIdx) => (
                                                <span key={sIdx} className={styles.skillTag}>{skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    }

                    if (content.type === 'summary') {
                        const summary = content as SummaryItem;
                        return (
                            <div key={item.id} className={styles.itemCard}>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    {summary.text}
                                </p>
                            </div>
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
}
