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
    onBulletDelete?: (sectionId: string, itemId: string, bulletId: string) => void;
    onBulletAdd?: (sectionId: string, itemId: string) => void;
    onItemDelete?: (sectionId: string, itemId: string) => void;
    onSectionDelete?: (sectionId: string) => void;
    onMetadataEdit?: (field: keyof ResumeMetadata, value: string) => void;
    editable?: boolean;
    highlightedBulletId?: string | null;
    highlightedItemId?: string | null;
}

export default function ResumePreview({
    resume,
    onBulletEdit,
    onBulletDelete,
    onBulletAdd,
    onItemDelete,
    onSectionDelete,
    onMetadataEdit,
    editable = true,
    highlightedBulletId = null,
    highlightedItemId = null
}: ResumePreviewProps) {
    return (
        <div className={styles.resume} data-resume-preview>
            <Header metadata={resume.metadata} onEdit={onMetadataEdit} editable={editable} />
            <div className={styles.sections}>
                {resume.sections
                    .sort((a, b) => a.order - b.order)
                    .map(section => (
                        <Section
                            key={section.id}
                            section={section}
                            onBulletEdit={onBulletEdit}
                            onBulletDelete={onBulletDelete}
                            onItemDelete={onItemDelete}
                            editable={editable}
                            highlightedBulletId={highlightedBulletId}
                            highlightedItemId={highlightedItemId}
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
                {contactParts.map((part, i) => {
                    // Check if it's a URL or email
                    const isUrl = part.includes('linkedin.com') || part.includes('github.com') || part.includes('http');
                    const isEmail = part.includes('@') && !part.includes('http');

                    return (
                        <span key={i} className={styles.contactItem}>
                            {isUrl ? (
                                <a href={part.startsWith('http') ? part : `https://${part}`} target="_blank" rel="noopener noreferrer">
                                    {part.replace(/^https?:\/\/(www\.)?/, '')}
                                </a>
                            ) : isEmail ? (
                                <a href={`mailto:${part}`}>{part}</a>
                            ) : (
                                part
                            )}
                            {i < contactParts.length - 1 && <span className={styles.separator}>•</span>}
                        </span>
                    );
                })}
            </div>
        </header>
    );
}

// Section Component
interface SectionProps {
    section: ResumeSection;
    onBulletEdit?: (sectionId: string, itemId: string, bulletId: string, newText: string) => void;
    onBulletDelete?: (sectionId: string, itemId: string, bulletId: string) => void;
    onBulletAdd?: (sectionId: string, itemId: string) => void;
    onItemDelete?: (sectionId: string, itemId: string) => void;
    onSectionDelete?: (sectionId: string) => void;
    editable: boolean;
    highlightedBulletId?: string | null;
    highlightedItemId?: string | null;
}

function Section({ section, onBulletEdit, onBulletDelete, onBulletAdd, onItemDelete, onSectionDelete, editable, highlightedBulletId, highlightedItemId }: SectionProps) {
    return (
        <section id={`section-${section.id}`} className={styles.section}>
            <h2 className={styles.sectionTitle}>
                {section.title}
                {editable && onSectionDelete && (
                    <button
                        className={styles.deleteSectionBtn}
                        onClick={() => onSectionDelete(section.id)}
                        title="Delete Section"
                    >
                        🗑️
                    </button>
                )}
            </h2>
            <div className={styles.sectionContent}>
                {section.items
                    .sort((a, b) => a.order - b.order)
                    .map(item => (
                        <SectionItemRenderer
                            key={item.id}
                            item={item}
                            sectionId={section.id}
                            onBulletEdit={onBulletEdit}
                            onBulletDelete={onBulletDelete}
                            onBulletAdd={onBulletAdd}
                            onItemDelete={onItemDelete}
                            editable={editable}
                            highlightedBulletId={highlightedBulletId}
                            highlightedItemId={highlightedItemId}
                        />
                    ))}
            </div>
        </section>
    );
}

// Helper to render markdown bold (**text**) as HTML
const renderWithMarkdown = (text: string) => {
    // Split by **bold** pattern
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};

// Section Item Renderer - handles different content types
interface SectionItemRendererProps {
    item: SectionItem;
    sectionId: string;
    onBulletEdit?: (sectionId: string, itemId: string, bulletId: string, newText: string) => void;
    onBulletDelete?: (sectionId: string, itemId: string, bulletId: string) => void;
    onBulletAdd?: (sectionId: string, itemId: string) => void;
    onItemDelete?: (sectionId: string, itemId: string) => void;
    editable: boolean;
    highlightedBulletId?: string | null;
    highlightedItemId?: string | null;
}

function SectionItemRenderer({ item, sectionId, onBulletEdit, onBulletDelete, onBulletAdd, onItemDelete, editable, highlightedBulletId, highlightedItemId }: SectionItemRendererProps) {
    const content = item.content;
    const isItemHighlighted = highlightedItemId === item.id;

    const wrapperClass = isItemHighlighted ? styles.highlightedItem : '';

    const renderContent = () => {
        switch (content.type) {
            case 'experience':
                return <ExperienceEntry content={content} itemId={item.id} sectionId={sectionId} onBulletEdit={onBulletEdit} onBulletDelete={onBulletDelete} onBulletAdd={onBulletAdd} onItemDelete={onItemDelete} editable={editable} highlightedBulletId={highlightedBulletId} />;
            case 'education':
                return <EducationEntry content={content} itemId={item.id} onItemDelete={onItemDelete} sectionId={sectionId} editable={editable} />;
            case 'skills':
                return <SkillsEntry content={content} itemId={item.id} onItemDelete={onItemDelete} sectionId={sectionId} editable={editable} />;
            case 'summary':
                return <SummaryEntry content={content} />;
            case 'project':
                return <ProjectEntry content={content} itemId={item.id} sectionId={sectionId} onBulletEdit={onBulletEdit} onBulletDelete={onBulletDelete} onBulletAdd={onBulletAdd} onItemDelete={onItemDelete} editable={editable} highlightedBulletId={highlightedBulletId} />;
            case 'custom':
                return <CustomEntry content={content} itemId={item.id} sectionId={sectionId} onBulletEdit={onBulletEdit} onBulletDelete={onBulletDelete} onBulletAdd={onBulletAdd} onItemDelete={onItemDelete} editable={editable} highlightedBulletId={highlightedBulletId} />;
            default:
                return null;
        }
    };

    return <div className={wrapperClass}>{renderContent()}</div>;
}

// Experience Entry - uses snake_case from API (start_date, end_date)
interface ExperienceEntryProps {
    content: ExperienceItem;
    itemId: string;
    sectionId: string;
    onBulletEdit?: (sectionId: string, itemId: string, bulletId: string, newText: string) => void;
    onBulletDelete?: (sectionId: string, itemId: string, bulletId: string) => void;
    onBulletAdd?: (sectionId: string, itemId: string) => void;
    onItemDelete?: (sectionId: string, itemId: string) => void;
    editable: boolean;
    highlightedBulletId?: string | null;
}

function ExperienceEntry({ content, itemId, sectionId, onBulletEdit, onBulletDelete, onBulletAdd, onItemDelete, editable, highlightedBulletId }: ExperienceEntryProps) {
    const startDate = content.start_date || '';
    const endDate = content.end_date || 'Present';
    const dateRange = startDate ? `${startDate} — ${endDate}` : endDate;

    return (
        <div className={styles.entry}>
            <div className={styles.entryHeader}>
                <span className={styles.entryTitle}>
                    {content.role}
                    {editable && onItemDelete && (
                        <button
                            className={styles.deleteItemBtn}
                            onClick={() => onItemDelete(sectionId, itemId)}
                            title="Delete entry"
                        >
                            🗑️
                        </button>
                    )}
                </span>
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
                onDelete={onBulletDelete}
                onAdd={onBulletAdd}
                editable={editable}
                highlightedBulletId={highlightedBulletId}
            />
        </div>
    );
}

// Education Entry - uses snake_case from API
interface EducationEntryProps {
    content: EducationItem;
    itemId: string;
    sectionId?: string;
    onItemDelete?: (sectionId: string, itemId: string) => void;
    editable?: boolean;
}

function EducationEntry({ content, itemId, sectionId, onItemDelete, editable }: EducationEntryProps) {
    let degreeLine = content.degree;
    if (content.field) {
        degreeLine += ` in ${content.field}`;
    }
    if (content.gpa) {
        degreeLine += ` | GPA: ${content.gpa}`;
    }
    const dateRange = content.end_date || '';

    return (
        <div className={styles.entry}>
            <div className={styles.entryHeader}>
                <span className={styles.entryTitle}>
                    {content.institution}
                    {editable && onItemDelete && sectionId && (
                        <button
                            className={styles.deleteItemBtn}
                            onClick={() => onItemDelete(sectionId, itemId)}
                            title="Delete entry"
                        >
                            🗑️
                        </button>
                    )}
                </span>
                <span className={styles.entryDate}>{dateRange}</span>
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
    itemId: string;
    sectionId?: string;
    onItemDelete?: (sectionId: string, itemId: string) => void;
    editable?: boolean;
}

function SkillsEntry({ content, itemId, sectionId, onItemDelete, editable }: SkillsEntryProps) {
    const categories = content.categories || [];
    return (
        <div className={styles.skillsList}>
            {categories.map((cat, i) => (
                <div key={i} className={styles.skillsItem}>
                    <span className={styles.skillCategory}>
                        {cat.name}:
                        {i === 0 && editable && onItemDelete && sectionId && (
                            <button
                                className={styles.deleteItemBtn}
                                onClick={() => onItemDelete(sectionId, itemId)}
                                title="Delete entry"
                            >
                                🗑️
                            </button>
                        )}
                    </span>
                    <span className={styles.skillsText}>{cat.skills.map((s, idx) => (
                        <span key={idx}>
                            {renderWithMarkdown(s)}
                            {idx < cat.skills.length - 1 ? ', ' : ''}
                        </span>
                    ))}</span>
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
    onBulletDelete?: (sectionId: string, itemId: string, bulletId: string) => void;
    onBulletAdd?: (sectionId: string, itemId: string) => void;
    onItemDelete?: (sectionId: string, itemId: string) => void;
    editable: boolean;
    highlightedBulletId?: string | null;
}

function ProjectEntry({ content, itemId, sectionId, onBulletEdit, onBulletDelete, onBulletAdd, onItemDelete, editable, highlightedBulletId }: ProjectEntryProps) {
    const techs = content.technologies || [];

    return (
        <div className={styles.entry}>
            <div className={styles.entryHeader}>
                <span className={styles.entryTitle}>
                    {content.name}
                    {techs.length > 0 && <span className={styles.technologies}> ({techs.join(', ')})</span>}
                    {editable && onItemDelete && (
                        <button
                            className={styles.deleteItemBtn}
                            onClick={() => onItemDelete(sectionId, itemId)}
                            title="Delete entry"
                        >
                            🗑️
                        </button>
                    )}
                </span>
            </div>
            {content.description && <p className={styles.descriptionText}>{content.description}</p>}
            <BulletList
                bullets={content.bullets}
                sectionId={sectionId}
                itemId={itemId}
                onEdit={onBulletEdit}
                onDelete={onBulletDelete}
                onAdd={onBulletAdd}
                editable={editable}
                highlightedBulletId={highlightedBulletId}
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
    onBulletDelete?: (sectionId: string, itemId: string, bulletId: string) => void;
    onBulletAdd?: (sectionId: string, itemId: string) => void;
    onItemDelete?: (sectionId: string, itemId: string) => void;
    editable: boolean;
    highlightedBulletId?: string | null;
}

function CustomEntry({ content, itemId, sectionId, onBulletEdit, onBulletDelete, onBulletAdd, onItemDelete, editable, highlightedBulletId }: CustomEntryProps) {
    return (
        <div className={styles.entry}>
            {content.title && (
                <div className={styles.entryHeader}>
                    <span className={styles.entryTitle}>
                        {content.title}
                        {editable && onItemDelete && (
                            <button
                                className={styles.deleteItemBtn}
                                onClick={() => onItemDelete(sectionId, itemId)}
                                title="Delete entry"
                            >
                                🗑️
                            </button>
                        )}
                    </span>
                </div>
            )}
            {(content.text || content.description) && <p className={styles.descriptionText}>{content.text || content.description}</p>}
            <BulletList
                bullets={content.bullets}
                sectionId={sectionId}
                itemId={itemId}
                onEdit={onBulletEdit}
                onDelete={onBulletDelete}
                onAdd={onBulletAdd}
                editable={editable}
                highlightedBulletId={highlightedBulletId}
            />
        </div>
    );
}

// Bullet List Component
interface BulletListProps {
    bullets?: { id: string; text: string; order: number }[];
    sectionId: string;
    itemId: string;
    onEdit?: (sectionId: string, itemId: string, bulletId: string, newText: string) => void;
    onDelete?: (sectionId: string, itemId: string, bulletId: string) => void;
    onAdd?: (sectionId: string, itemId: string) => void;
    editable: boolean;
    highlightedBulletId?: string | null;
}

function BulletList({ bullets, sectionId, itemId, onEdit, onDelete, onAdd, editable, highlightedBulletId }: BulletListProps) {
    // If editable, we show the list even if empty (to show Add button)
    if ((!bullets || bullets.length === 0) && !editable) return null;

    // Ensure bullets is an array
    const safeBullets = bullets || [];

    const handleBulletEdit = (bulletId: string) => (e: React.FocusEvent<HTMLSpanElement>) => {
        if (onEdit && e.target.textContent !== null) {
            onEdit(sectionId, itemId, bulletId, e.target.textContent);
        }
    };

    // Helper to render markdown bold (**text**) as HTML
    const renderWithMarkdown = (text: string) => {
        // Split by **bold** pattern
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <ul className={styles.bulletList}>
            {safeBullets
                .sort((a, b) => a.order - b.order)
                .map(bullet => {
                    const isHighlighted = highlightedBulletId === bullet.id;
                    return (
                        <li
                            key={bullet.id}
                            className={`${styles.bulletItem} ${isHighlighted ? styles.highlightedBullet : ''}`}
                        >
                            <span
                                contentEditable={editable}
                                suppressContentEditableWarning
                                onBlur={handleBulletEdit(bullet.id)}
                            >
                                {renderWithMarkdown(bullet.text)}
                            </span>
                            {editable && onDelete && (
                                <button
                                    className={styles.deleteBulletBtn}
                                    onClick={() => onDelete(sectionId, itemId, bullet.id)}
                                    title="Delete bullet"
                                >
                                    🗑️
                                </button>
                            )}
                        </li>
                    );
                })}
            {editable && onAdd && (
                <li className={styles.addBulletItem}>
                    <button
                        className={styles.addBulletBtn}
                        onClick={() => onAdd(sectionId, itemId)}
                        title="Add bullet"
                    >
                        + Add Bullet
                    </button>
                </li>
            )}
        </ul>
    );
}
