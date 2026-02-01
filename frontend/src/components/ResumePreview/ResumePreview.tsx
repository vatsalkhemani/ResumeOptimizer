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
    onSectionItemAdd?: (sectionId: string) => void;
    onMetadataEdit?: (field: keyof ResumeMetadata, value: string) => void;
    onSkillCategoryUpdate?: (sectionId: string, itemId: string, categoryIndex: number, field: 'name' | 'skills', value: string | string[]) => void;
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
    onSectionItemAdd,
    onMetadataEdit,
    onSkillCategoryUpdate,
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
                            onBulletAdd={onBulletAdd}
                            onItemDelete={onItemDelete}
                            onSectionItemAdd={onSectionItemAdd}
                            onSkillCategoryUpdate={onSkillCategoryUpdate}
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
    onSectionItemAdd?: (sectionId: string) => void;
    onSkillCategoryUpdate?: (sectionId: string, itemId: string, categoryIndex: number, field: 'name' | 'skills', value: string | string[]) => void;
    editable: boolean;
    highlightedBulletId?: string | null;
    highlightedItemId?: string | null;
}

function Section({ section, onBulletEdit, onBulletDelete, onBulletAdd, onItemDelete, onSectionDelete, onSectionItemAdd, onSkillCategoryUpdate, editable, highlightedBulletId, highlightedItemId }: SectionProps) {
    return (
        <section id={`section-${section.id}`} className={styles.section}>
            <div className={styles.sectionHeaderWrapper}>
                <h2 className={styles.sectionTitle}>
                    {section.title}
                </h2>
                {editable && (
                    <div className={styles.sectionActions}>
                        {onSectionDelete && (
                            <button
                                className={styles.deleteSectionBtn}
                                onClick={() => onSectionDelete(section.id)}
                                title="Delete Section"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                )}
            </div>
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
                            onSectionItemAdd={onSectionItemAdd}
                            onSkillCategoryUpdate={onSkillCategoryUpdate}
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
    onSectionItemAdd?: (sectionId: string) => void;
    onItemDelete?: (sectionId: string, itemId: string) => void;
    onSkillCategoryUpdate?: (sectionId: string, itemId: string, categoryIndex: number, field: 'name' | 'skills', value: string | string[]) => void;
    editable: boolean;
    highlightedBulletId?: string | null;
    highlightedItemId?: string | null;
}

function SectionItemRenderer({ item, sectionId, onBulletEdit, onBulletDelete, onBulletAdd, onItemDelete, onSectionItemAdd, onSkillCategoryUpdate, editable, highlightedBulletId, highlightedItemId }: SectionItemRendererProps) {
    const content = item.content;
    const isItemHighlighted = highlightedItemId === item.id;

    const wrapperClass = isItemHighlighted ? styles.highlightedItem : '';

    const renderContent = () => {
        switch (content.type) {
            case 'experience':
                return <ExperienceEntry content={content} itemId={item.id} sectionId={sectionId} onBulletEdit={onBulletEdit} onBulletDelete={onBulletDelete} onBulletAdd={onBulletAdd} onItemDelete={onItemDelete} onSectionItemAdd={onSectionItemAdd} editable={editable} highlightedBulletId={highlightedBulletId} />;
            case 'education':
                return <EducationEntry content={content} itemId={item.id} onItemDelete={onItemDelete} onSectionItemAdd={onSectionItemAdd} onBulletAdd={onBulletAdd} sectionId={sectionId} editable={editable} />;
            case 'skills':
                return <SkillsEntry content={content} itemId={item.id} onItemDelete={onItemDelete} sectionId={sectionId} onSkillCategoryUpdate={onSkillCategoryUpdate} editable={editable} />;
            case 'summary':
                return <SummaryEntry content={content} />;
            case 'project':
                return <ProjectEntry content={content} itemId={item.id} sectionId={sectionId} onBulletEdit={onBulletEdit} onBulletDelete={onBulletDelete} onBulletAdd={onBulletAdd} onItemDelete={onItemDelete} onSectionItemAdd={onSectionItemAdd} editable={editable} highlightedBulletId={highlightedBulletId} />;
            case 'custom':
                return <CustomEntry content={content} itemId={item.id} sectionId={sectionId} onBulletEdit={onBulletEdit} onBulletDelete={onBulletDelete} onBulletAdd={onBulletAdd} onItemDelete={onItemDelete} onSectionItemAdd={onSectionItemAdd} editable={editable} highlightedBulletId={highlightedBulletId} />;
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
    onSectionItemAdd?: (sectionId: string) => void;
    editable: boolean;
    highlightedBulletId?: string | null;
}

function ExperienceEntry({ content, itemId, sectionId, onBulletEdit, onBulletDelete, onBulletAdd, onItemDelete, onSectionItemAdd, editable, highlightedBulletId }: ExperienceEntryProps) {
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
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span>{content.company}</span>
                    {editable && onBulletAdd && (
                        <button
                            className={styles.addSectionItemBtn}
                            onClick={() => onBulletAdd(sectionId, itemId)}
                            style={{ fontSize: '16px', marginLeft: '6px', verticalAlign: 'middle', border: 'none', background: 'none', cursor: 'pointer', color: '#000' }}
                        >
                            +
                        </button>
                    )}
                </div>
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
    onSectionItemAdd?: (sectionId: string) => void;
    editable?: boolean;
    onBulletAdd?: (sectionId: string, itemId: string) => void; // Added for consistency
}

function EducationEntry({ content, itemId, sectionId, onItemDelete, onSectionItemAdd, editable, onBulletAdd }: EducationEntryProps) {
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
                            style={{ margin: 0 }}
                        >
                            🗑️
                        </button>
                    )}
                </span>
                <span className={styles.entryDate}>{dateRange}</span>
            </div>
            <div className={styles.entrySubtitle}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span>{degreeLine}</span>
                    {editable && onBulletAdd && sectionId && (
                        <button
                            className={styles.addSectionItemBtn}
                            onClick={() => onBulletAdd(sectionId, itemId)}
                            style={{ fontSize: '16px', marginLeft: '6px', verticalAlign: 'middle', border: 'none', background: 'none', cursor: 'pointer', color: '#000' }}
                        >
                            +
                        </button>
                    )}
                </div>
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
    onSkillCategoryUpdate?: (sectionId: string, itemId: string, categoryIndex: number, field: 'name' | 'skills', value: string | string[]) => void;
    editable?: boolean;
}

function SkillsEntry({ content, itemId, sectionId, onItemDelete, editable, onSkillCategoryUpdate }: SkillsEntryProps) {
    const categories = content.categories || [];

    const handleNameBlur = (catIndex: number) => (e: React.FocusEvent<HTMLElement>) => {
        if (onSkillCategoryUpdate && e.target.textContent !== null) {
            onSkillCategoryUpdate(sectionId || '', itemId, catIndex, 'name', e.target.textContent);
        }
    };

    const handleSkillsBlur = (catIndex: number) => (e: React.FocusEvent<HTMLElement>) => {
        if (onSkillCategoryUpdate && e.target.textContent !== null) {
            const skills = e.target.textContent.split(',').map(s => s.trim()).filter(Boolean);
            onSkillCategoryUpdate(sectionId || '', itemId, catIndex, 'skills', skills);
        }
    };

    return (
        <div className={styles.skillsList}>
            {categories.map((cat, i) => (
                <div key={i} className={styles.skillsItem}>
                    {/* Category Name - Bold and Inline */}
                    <span className={styles.skillCategory}>
                        <strong
                            contentEditable={editable}
                            suppressContentEditableWarning
                            onBlur={handleNameBlur(i)}
                        >{cat.name}: </strong>
                    </span>

                    {/* Skills List - Inline */}
                    <span
                        className={styles.skillsText}
                        contentEditable={editable}
                        suppressContentEditableWarning
                        onBlur={handleSkillsBlur(i)}
                    >
                        {cat.skills.join(', ')}
                    </span>

                    {/* Delete Button (only on first category for now or we need finer grain control) */}
                    {i === 0 && editable && onItemDelete && sectionId && (
                        <button
                            className={styles.deleteItemBtn}
                            onClick={() => onItemDelete(sectionId, itemId)}
                            title="Delete entry"
                            style={{ marginLeft: '8px', verticalAlign: 'text-bottom' }}
                        >
                            🗑️
                        </button>
                    )}
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
    onSectionItemAdd?: (sectionId: string) => void;
    editable: boolean;
    highlightedBulletId?: string | null;
}

function ProjectEntry({ content, itemId, sectionId, onBulletEdit, onBulletDelete, onBulletAdd, onItemDelete, onSectionItemAdd, editable, highlightedBulletId }: ProjectEntryProps) {
    const techs = content.technologies || [];

    return (
        <div className={styles.entry}>
            <div className={styles.entryHeader}>
                <span className={styles.entryTitle}>
                    {content.name}
                    {techs.length > 0 && <span className={styles.technologies}> ({techs.join(', ')})</span>}
                    {editable && onItemDelete && (
                        <span style={{ display: 'inline-flex', gap: '4px', verticalAlign: 'middle', marginLeft: '8px' }}>
                            {/* Project doesn't have subtitle, so keep here but change to add BULLET */}
                            {onBulletAdd && (
                                <button
                                    className={styles.addSectionItemBtn}
                                    onClick={() => onBulletAdd(sectionId, itemId)}
                                    title="Add Bullet"
                                    style={{ opacity: 1, fontSize: '16px' }}
                                >
                                    +
                                </button>
                            )}
                            <button
                                className={styles.deleteItemBtn}
                                onClick={() => onItemDelete(sectionId, itemId)}
                                title="Delete entry"
                                style={{ margin: 0 }}
                            >
                                🗑️
                            </button>
                        </span>
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
    onSectionItemAdd?: (sectionId: string) => void;
    editable: boolean;
    highlightedBulletId?: string | null;
}

function CustomEntry({ content, itemId, sectionId, onBulletEdit, onBulletDelete, onBulletAdd, onItemDelete, onSectionItemAdd, editable, highlightedBulletId }: CustomEntryProps) {
    return (
        <div className={styles.entry}>
            {(content.title) && (
                <div className={styles.entryHeader}>
                    <span className={styles.entryTitle}>
                        {content.title}
                        {editable && onItemDelete && (
                            <div style={{ display: 'inline-flex', gap: '4px', verticalAlign: 'middle', marginLeft: '8px' }}>
                                {onBulletAdd && (
                                    <button
                                        className={styles.addSectionItemBtn}
                                        onClick={() => onBulletAdd(sectionId, itemId)}
                                        title="Add Bullet"
                                        style={{ opacity: 1, fontSize: '16px' }}
                                    >
                                        +
                                    </button>
                                )}
                                <button
                                    className={styles.deleteItemBtn}
                                    onClick={() => onItemDelete(sectionId, itemId)}
                                    title="Delete entry"
                                    style={{ margin: 0 }}
                                >
                                    🗑️
                                </button>
                            </div>
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

        </ul>
    );
}
