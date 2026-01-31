"""
Analysis Data Models for Resume suggestions and scoring.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
import uuid

class SuggestionType(str, Enum):
    CRITICAL = "critical"
    ENHANCEMENT = "enhancement"

class SuggestionAction(str, Enum):
    REWRITE = "rewrite"
    ADD = "add"
    DELETE = "delete"
    REMOVE = "remove"  # Alias for delete
    FORMAT = "format"

class SuggestionCategory(str, Enum):
    CONTENT = "content"      # Text changes: add, edit, rewrite
    FORMATTING = "formatting" # Bold, italics, structure

class Suggestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: SuggestionType
    action: SuggestionAction
    category: SuggestionCategory = SuggestionCategory.CONTENT
    section_id: Optional[str] = None # ID of the section this applies to
    item_id: Optional[str] = None    # ID of the specific item (e.g. job entry)
    bullet_id: Optional[str] = None  # ID of the specific bullet point
    field: Optional[str] = None      # Field name (e.g. "bullets", "summary")
    title: str
    description: str
    current_text: Optional[str] = None
    suggested_text: Optional[str] = None
    impact: str = "Medium" # High, Medium, Low
    score_impact: int = 0  # Estimated score improvement

class KeywordCategory(str, Enum):
    SKILL = "skill"
    TOOL = "tool"
    CERT = "certification"
    SOFT_SKILL = "soft_skill"
    OTHER = "other"

class KeywordMatch(BaseModel):
    term: str
    category: KeywordCategory = KeywordCategory.OTHER
    found: bool
    context: Optional[str] = None
    importance: str = "Medium"

class AnalysisResult(BaseModel):
    score: int
    match_score: Optional[int] = None
    summary: str
    suggestions: List[Suggestion]
    keywords: List[KeywordMatch] = []
