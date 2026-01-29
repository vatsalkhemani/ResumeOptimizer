/**
 * ResumePreview - Renders a Resume model as styled HTML
 * This is the single source of truth for how the resume looks.
 * The same styling is used for both preview and PDF generation.
 */
'use client';

import {
    Resume,
    ResumeSection,
    SectionItem,
    ResumeMetadata,
    ExperienceItem,
    EducationItem,
    SkillsItem,
    SummaryItem,
    ProjectItem,
    CustomItem
} from '@/lib/types';
import styles from './ResumePreview.module.css';

interface ResumePreviewProps {
    resume: Resume;
    onBulletEdit?: (sectionId: string, itemId: string, bulletId: string, newText: string) => void;
    onMetadataEdit?: (field: keyof ResumeMetadata, value: string) => void;
    editable?: boolean;
}

export default function ResumePreview({
    resume,
    onBulletEdit,
    onMetadataEdit,
    editable = true
}: ResumePreviewProps) {
    return (
        <div className={styles.resume}>
            <Header metadata={resume.metadata} onEdit={onMetadataEdit} editable={editable} />
            <div className={styles.sections}>
                {resume.sections
                    .sort((a, b) => a.order - b.order)
                    .map(section => (
                        <Section
                            key={section.id}
                            section={section}
                            onBulletEdit={onBulletEdit}
                            editable={editable}
                        />
                    ))}
            </div>
        </div>
    );
}

// Header Component
interface HeaderProps {
    metadata: ResumeMetadata;
    onEdit?: (field: keyof ResumeMetadata, value: string) => void;
    editable: boolean;
}

function Header({ metadata, onEdit, editable }: HeaderProps) {
    const handleEdit = (field: keyof ResumeMetadata) => (e: React.FocusEvent<HTMLSpanElement>) => {
        if (onEdit && e.target.textContent !== null) {
            onEdit(field, e.target.textContent);
        }
    };

    const contactParts: string[] = [];
    if (metadata.location) contactParts.push(metadata.location);
    if (metadata.email) contactParts.push(metadata.email);
    if (metadata.phone) contactParts.push(metadata.phone);
    if (metadata.linkedin) contactParts.push(metadata.linkedin);
    if (metadata.github) contactParts.push(metadata.github);
    if (metadata.website) contactParts.push(metadata.website);

    return (
        <header className={styles.header}>
            <h1
                className={styles.name}
                contentEditable={editable}
                suppressContentEditableWarning
                onBlur={handleEdit('name')}
            >
                {metadata.name}
            </h1>
            <div className={styles.contact}>
                {contactParts.map((part, i) => (
                    <span key={i} className={styles.contactItem}>
                        {part}
                        {i < contactParts.length - 1 && <span className={styles.separator}>•</span>}
                    </span>
                ))}
            </div>
        </header>
    );
}

// Section Component
interface SectionProps {
    section: ResumeSection;
    onBulletEdit?: (sectionId: string, itemId: string, bulletId: string, newText: string) => void;
    editable: boolean;
}

function Section({ section, onBulletEdit, editable }: SectionProps) {
    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            <div className={styles.sectionContent}>
                {section.items
                    .sort((a, b) => a.order - b.order)
                    .map(item => (
                        <SectionItemRenderer
                            key={item.id}
                            item={item}
                            sectionId={section.id}
                            onBulletEdit={onBulletEdit}
                            editable={editable}
                        />
                    ))}
            </div>
        </section>
    );
}

// Section Item Renderer - handles different content types
interface SectionItemRendererProps {
    item: SectionItem;
    sectionId: string;
    onBulletEdit?: (sectionId: string, itemId: string, bulletId: string, newText: string) => void;
    editable: boolean;
}

function SectionItemRenderer({ item, sectionId, onBulletEdit, editable }: SectionItemRendererProps) {
    const content = item.content;

    switch (content.type) {
        case 'experience':
            return <ExperienceEntry content={content} itemId={item.id} sectionId={sectionId} onBulletEdit={onBulletEdit} editable={editable} />;
        case 'education':
            return <EducationEntry content={content} itemId={item.id} />;
        case 'skills':
            return <SkillsEntry content={content} />;
        case 'summary':
            return <SummaryEntry content={content} />;
        case 'project':
            return <ProjectEntry content={content} itemId={item.id} sectionId={sectionId} onBulletEdit={onBulletEdit} editable={editable} />;
        case 'custom':
            return <CustomEntry content={content} itemId={item.id} sectionId={sectionId} onBulletEdit={onBulletEdit} editable={editable} />;
        default:
            return null;
    }
}

// Experience Entry - uses snake_case from API (start_date, end_date)
interface ExperienceEntryProps {
    content: ExperienceItem;
    itemId: string;
    sectionId: string;
    onBulletEdit?: (sectionId: string, itemId: string, bulletId: string, newText: string) => void;
    editable: boolean;
}

function ExperienceEntry({ content, itemId, sectionId, onBulletEdit, editable }: ExperienceEntryProps) {
    const startDate = content.start_date || '';
    const endDate = content.end_date || 'Present';
    const dateRange = startDate ? `${startDate} — ${endDate}` : endDate;

    return (
        <div className={styles.entry}>
            <div className={styles.entryHeader}>
                <span className={styles.entryTitle}>{content.role}</span>
                <span className={styles.entryDate}>{dateRange}</span>
            </div>
            <div className={styles.entrySubtitle}>
                <span>{content.company}</span>
                {content.location && <span>{content.location}</span>}
            </div>
            <BulletList
                bullets={content.bullets}
                sectionId={sectionId}
                itemId={itemId}
                onEdit={onBulletEdit}
                editable={editable}
            />
        </div>
    );
}

// Education Entry - uses snake_case from API
interface EducationEntryProps {
    content: EducationItem;
    itemId: string;
}

function EducationEntry({ content }: EducationEntryProps) {
    let degreeLine = content.degree;
    if (content.field) {
        degreeLine += ` in ${content.field}`;
    }
    if (content.gpa) {
        degreeLine += ` | GPA: ${content.gpa}`;
    }

    return (
        <div className={styles.entry}>
            <div className={styles.entryHeader}>
                <span className={styles.entryTitle}>{content.institution}</span>
                <span className={styles.entryDate}>{content.end_date}</span>
            </div>
            <div className={styles.entrySubtitle}>
                <span>{degreeLine}</span>
                {content.location && <span>{content.location}</span>}
            </div>
        </div>
    );
}

// Skills Entry
interface SkillsEntryProps {
    content: SkillsItem;
}

function SkillsEntry({ content }: SkillsEntryProps) {
    return (
        <div className={styles.skillsContainer}>
            {content.categories.map((category, index) => (
                <div key={index} className={styles.skillCategory}>
                    <span className={styles.skillCategoryName}>{category.name}:</span>
                    <span className={styles.skillList}>{category.skills.join(', ')}</span>
                </div>
            ))}
        </div>
    );
}

// Summary Entry
interface SummaryEntryProps {
    content: SummaryItem;
}

function SummaryEntry({ content }: SummaryEntryProps) {
    return <p className={styles.summaryText}>{content.text}</p>;
}

// Project Entry
interface ProjectEntryProps {
    content: ProjectItem;
    itemId: string;
    sectionId: string;
    onBulletEdit?: (sectionId: string, itemId: string, bulletId: string, newText: string) => void;
    editable: boolean;
}

function ProjectEntry({ content, itemId, sectionId, onBulletEdit, editable }: ProjectEntryProps) {
    return (
        <div className={styles.entry}>
            <div className={styles.entryHeader}>
                <span className={styles.entryTitle}>
                    {content.name}
                    {content.technologies && content.technologies.length > 0 && (
                        <span className={styles.technologies}> ({content.technologies.join(', ')})</span>
                    )}
                </span>
            </div>
            <BulletList
                bullets={content.bullets}
                sectionId={sectionId}
                itemId={itemId}
                onEdit={onBulletEdit}
                editable={editable}
            />
        </div>
    );
}

// Custom Entry
interface CustomEntryProps {
    content: CustomItem;
    itemId: string;
    sectionId: string;
    onBulletEdit?: (sectionId: string, itemId: string, bulletId: string, newText: string) => void;
    editable: boolean;
}

function CustomEntry({ content, itemId, sectionId, onBulletEdit, editable }: CustomEntryProps) {
    return (
        <div className={styles.entry}>
            {content.title && (
                <div className={styles.entryHeader}>
                    <span className={styles.entryTitle}>{content.title}</span>
                </div>
            )}
            <BulletList
                bullets={content.bullets}
                sectionId={sectionId}
                itemId={itemId}
                onEdit={onBulletEdit}
                editable={editable}
            />
        </div>
    );
}

// Bullet List Component
interface BulletListProps {
    bullets: { id: string; text: string; order: number }[];
    sectionId: string;
    itemId: string;
    onEdit?: (sectionId: string, itemId: string, bulletId: string, newText: string) => void;
    editable: boolean;
}

function BulletList({ bullets, sectionId, itemId, onEdit, editable }: BulletListProps) {
    if (!bullets || bullets.length === 0) return null;

    const handleBulletEdit = (bulletId: string) => (e: React.FocusEvent<HTMLLIElement>) => {
        if (onEdit && e.target.textContent !== null) {
            onEdit(sectionId, itemId, bulletId, e.target.textContent);
        }
    };

    return (
        <ul className={styles.bulletList}>
            {bullets
                .sort((a, b) => a.order - b.order)
                .map(bullet => (
                    <li
                        key={bullet.id}
                        className={styles.bulletItem}
                        contentEditable={editable}
                        suppressContentEditableWarning
                        onBlur={handleBulletEdit(bullet.id)}
                    >
                        {bullet.text}
                    </li>
                ))}
        </ul>
    );
}
