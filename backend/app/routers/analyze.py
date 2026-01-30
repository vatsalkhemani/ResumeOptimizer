"""
Analyze Router - Handles AI analysis requests.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.models.resume import Resume
from app.models.analysis import AnalysisResult
from app.services.analysis import AnalysisService

router = APIRouter()

class AnalyzeRequest(BaseModel):
    resume: Resume
    job_description: str

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
