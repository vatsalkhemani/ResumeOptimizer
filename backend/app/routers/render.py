"""
Render Router - Handles LaTeX rendering and PDF compilation
"""
from fastapi import APIRouter, HTTPException
from app.services.latex_renderer import LaTeXRenderer
from app.models.resume import RenderRequest, RenderResponse

router = APIRouter()
renderer = LaTeXRenderer()


@router.post("/render", response_model=RenderResponse)
async def render_resume(request: RenderRequest):
    """
    Render a resume to LaTeX and compile to PDF.
    Returns both the LaTeX source and base64-encoded PDF.
    """
    try:
        latex, pdf_base64 = renderer.render_and_compile(request.resume)
        
        if not pdf_base64:
            # If PDF compilation failed, still return LaTeX
            return RenderResponse(
                latex=latex,
                pdf_base64=""
            )
        
        return RenderResponse(
            latex=latex,
            pdf_base64=pdf_base64
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error rendering resume: {str(e)}"
        )


@router.post("/render/latex")
async def render_latex_only(request: RenderRequest):
    """
    Render a resume to LaTeX source only (without PDF compilation).
    Useful for preview or when LaTeX is not installed.
    """
    try:
        latex = renderer.render(request.resume)
        return {"latex": latex}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error rendering LaTeX: {str(e)}"
        )
