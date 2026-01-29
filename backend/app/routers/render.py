"""
Render Router - Handles PDF generation for export
Uses ReportLab for PDF - pure Python, no external installations required
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from app.services.pdf_renderer import PDFRenderer
from app.models.resume import Resume

router = APIRouter()
renderer = PDFRenderer()


class RenderRequest(BaseModel):
    resume: Resume


@router.post("/render/pdf")
async def render_pdf(request: RenderRequest):
    """
    Generate PDF from resume for download.
    Returns the PDF as binary content.
    """
    try:
        pdf_bytes = renderer.render_pdf(request.resume)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=resume.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")
