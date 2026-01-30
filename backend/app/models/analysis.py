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

class Suggestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: SuggestionType
    action: SuggestionAction
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

class AnalysisResult(BaseModel):
    score: int
    summary: str
    suggestions: List[Suggestion]
