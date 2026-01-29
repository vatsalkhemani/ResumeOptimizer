"""
Parse Router - Handles resume file upload and parsing
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.parser import ResumeParser
from app.models.resume import ParseResponse

router = APIRouter()
parser = ResumeParser()


@router.post("/parse", response_model=ParseResponse)
async def parse_resume(file: UploadFile = File(...)):
    """
    Parse an uploaded resume file (PDF or DOCX) and return structured data.
    """
    # Validate file type
    filename = file.filename.lower() if file.filename else ""
    
    if not (filename.endswith('.pdf') or filename.endswith('.docx')):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a PDF or DOCX file."
        )
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading file: {str(e)}"
        )
    
    # Parse based on file type
    try:
        if filename.endswith('.pdf'):
            resume, warnings = parser.parse_pdf(content)
        else:
            resume, warnings = parser.parse_docx(content)
        
        return ParseResponse(resume=resume, warnings=warnings)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error parsing resume: {str(e)}"
        )
