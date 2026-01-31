"""
Analyze Router - Handles AI analysis requests.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.models.resume import Resume
from app.models.analysis import AnalysisResult
from app.services.analysis import AnalysisService

router = APIRouter()

class AnalyzeRequest(BaseModel):
    resume: Resume
    job_description: str

class CustomEditRequest(BaseModel):
    current_text: str
    prompt: str
    section_id: Optional[str] = None
    item_id: Optional[str] = None
    bullet_id: Optional[str] = None
    section_type: Optional[str] = "experience"
    job_description: Optional[str] = ""

class CustomEditResponse(BaseModel):
    suggested_text: str
    explanation: str
    action: str = "rewrite"
    section_id: Optional[str] = None
    item_id: Optional[str] = None
    bullet_id: Optional[str] = None

def get_analysis_service():
    return AnalysisService()

@router.post("/analyze", response_model=AnalysisResult)
async def analyze_resume(
    request: AnalyzeRequest,
    service: AnalysisService = Depends(get_analysis_service)
):
    """
    Analyze resume against job description and generate suggestions.
    """
    if not request.job_description.strip():
        # Optional: We could support analysis without JD later, but for now specific to JD
        pass 
        
    try:
        result = service.analyze_resume(request.resume, request.job_description)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/custom-edit", response_model=CustomEditResponse)
async def custom_edit(
    request: CustomEditRequest,
    service: AnalysisService = Depends(get_analysis_service)
):
    """
    Process a custom edit request from the user.
    Takes current text and user instruction, returns AI-edited text.
    """
    try:
        context = {
            "section_type": request.section_type,
            "job_description": request.job_description or ""
        }
        
        result = service.custom_edit(
            current_text=request.current_text,
            user_prompt=request.prompt,
            context=context
        )
        
        return CustomEditResponse(
            suggested_text=result["suggested_text"],
            explanation=result["explanation"],
            action=result.get("action", "rewrite"),
            section_id=request.section_id,
            item_id=request.item_id,
            bullet_id=request.bullet_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

