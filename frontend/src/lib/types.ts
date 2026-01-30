/**
 * Resume Optimizer - TypeScript Types
 * Matches the backend Pydantic models
 */

// Section Types
export type SectionType =
    | 'summary'
    | 'experience'
    | 'education'
    | 'skills'
    | 'projects'
    | 'certifications'
    | 'languages'
    | 'custom';

// Bullet point
export interface Bullet {
    id: string;
    text: string;
    order: number;
}

// Skill category
export interface SkillCategory {
    name: string;
    skills: string[];
}

// Experience item
export interface ExperienceItem {
    type: 'experience';
    company: string;
    role: string;
    location?: string;
    start_date: string;
    end_date?: string | null; // null means "Present"
    bullets: Bullet[];
}

// Education item
export interface EducationItem {
    type: 'education';
    institution: string;
    degree: string;
    field?: string;
    location?: string;
    start_date?: string;
    end_date: string;
    gpa?: string;
    bullets: Bullet[];
}

// Skills item
export interface SkillsItem {
    type: 'skills';
    categories: SkillCategory[];
}

// Summary item
export interface SummaryItem {
    type: 'summary';
    text: string;
}

// Project item
export interface ProjectItem {
    type: 'project';
    name: string;
    description?: string;
    technologies?: string[];
    url?: string;
    bullets: Bullet[];
}

// Custom item
export interface CustomItem {
    type: 'custom';
    title?: string;
    subtitle?: string;
    date_range?: string;
    location?: string;
    bullets: Bullet[];
}

// Union type for all item content types
export type ItemContent =
    | ExperienceItem
    | EducationItem
    | SkillsItem
    | SummaryItem
    | ProjectItem
    | CustomItem;

// Section item wrapper
export interface SectionItem {
    id: string;
    order: number;
    content: ItemContent;
}

// Resume section
export interface ResumeSection {
    id: string;
    type: SectionType;
    title: string;
    order: number;
    items: SectionItem[];
}

// Resume metadata (contact info)
export interface ResumeMetadata {
    name: string;
    location?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    website?: string;
    github?: string;
}

// Complete Resume
export interface Resume {
    id: string;
    metadata: ResumeMetadata;
    sections: ResumeSection[];
    version: number;
    created_at: string;
    updated_at: string;
}

// API Response types
export interface ParseResponse {
    resume: Resume;
    warnings: string[];
}

export interface RenderResponse {
    latex: string;
    pdf_base64: string;
}

// Analysis Types
export type SuggestionType = 'critical' | 'stylistic' | 'formatting' | 'content';
export type SuggestionAction = 'rewrite' | 'add' | 'delete' | 'format';

export interface Suggestion {
    id: string;
    type: SuggestionType;
    action: SuggestionAction;
    section_id?: string;
    item_id?: string;
    bullet_id?: string;
    field?: string;
    title: string;
    description: string;
    current_text?: string;
    suggested_text?: string;
    impact: string; // 'High' | 'Medium' | 'Low'
    score_impact: number;

    // UI State (Frontend only)
    isAccepted?: boolean;
    isDismissed?: boolean;
}

export interface AnalysisResult {
    score: number;
    summary: string;
    suggestions: Suggestion[];
}

// Job Description (for Phase 2)
export interface Keyword {
    term: string;
    frequency: number;
    category: 'skill' | 'methodology' | 'tool' | 'soft_skill';
    foundInResume: boolean;
}

export interface JobDescription {
    id: string;
    rawText: string;
    title?: string;
    company?: string;
    extractedKeywords: Keyword[];
    requiredSkills: string[];
    preferredSkills: string[];
    responsibilities: string[];
}
