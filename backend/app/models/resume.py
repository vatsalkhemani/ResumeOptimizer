"""
Resume data models using Pydantic
"""
from pydantic import BaseModel, Field
from typing import Optional, Union
from datetime import datetime
from enum import Enum
import uuid


class SectionType(str, Enum):
    SUMMARY = "summary"
    EXPERIENCE = "experience"
    EDUCATION = "education"
    SKILLS = "skills"
    PROJECTS = "projects"
    CERTIFICATIONS = "certifications"
    LANGUAGES = "languages"
    CUSTOM = "custom"


class Bullet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    order: int


class SkillCategory(BaseModel):
    name: str
    skills: list[str]


class ExperienceItem(BaseModel):
    type: str = "experience"
    company: str
    role: str
    location: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None  # None means "Present"
    bullets: list[Bullet] = []


class EducationItem(BaseModel):
    type: str = "education"
    institution: str
    degree: str
    field: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: str
    gpa: Optional[str] = None
    bullets: list[Bullet] = []


class SkillsItem(BaseModel):
    type: str = "skills"
    categories: list[SkillCategory] = []


class SummaryItem(BaseModel):
    type: str = "summary"
    text: str


class ProjectItem(BaseModel):
    type: str = "project"
    name: str
    description: Optional[str] = None
    technologies: Optional[list[str]] = None
    url: Optional[str] = None
    bullets: list[Bullet] = []


class CustomItem(BaseModel):
    type: str = "custom"
    title: Optional[str] = None
    subtitle: Optional[str] = None
    date_range: Optional[str] = None
    location: Optional[str] = None
    bullets: list[Bullet] = []


# Union type for all possible section items
ItemContent = Union[
    ExperienceItem,
    EducationItem,
    SkillsItem,
    SummaryItem,
    ProjectItem,
    CustomItem
]


class SectionItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order: int
    content: ItemContent


class ResumeSection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: SectionType
    title: str
    order: int
    items: list[SectionItem] = []


class ResumeMetadata(BaseModel):
    name: str
    location: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    github: Optional[str] = None


class Resume(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    metadata: ResumeMetadata
    sections: list[ResumeSection] = []
    version: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ParseResponse(BaseModel):
    resume: Resume
    warnings: list[str] = []


class RenderRequest(BaseModel):
    resume: Resume


class RenderResponse(BaseModel):
    latex: str
    pdf_base64: str
