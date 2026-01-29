"""
LaTeX Renderer Service - Converts Resume model to LaTeX and compiles to PDF
"""
import subprocess
import tempfile
import os
import base64
from pathlib import Path
from typing import Optional

from app.models.resume import (
    Resume, ResumeSection, SectionItem, SectionType,
    ExperienceItem, EducationItem, SkillsItem, SummaryItem,
    ProjectItem, CustomItem
)


class LaTeXRenderer:
    """Renders Resume model to LaTeX and compiles to PDF"""
    
    def __init__(self):
        self.template_dir = Path(__file__).parent.parent / "templates"
    
    def render(self, resume: Resume) -> str:
        """Convert Resume model to LaTeX source"""
        latex = self._get_preamble()
        latex += self._render_header(resume.metadata)
        
        for section in sorted(resume.sections, key=lambda s: s.order):
            latex += self._render_section(section)
        
        latex += self._get_footer()
        return latex
    
    def compile_to_pdf(self, latex_source: str) -> Optional[bytes]:
        """Compile LaTeX source to PDF, returns PDF bytes or None on failure"""
        with tempfile.TemporaryDirectory() as tmpdir:
            tex_path = Path(tmpdir) / "resume.tex"
            pdf_path = Path(tmpdir) / "resume.pdf"
            
            # Write LaTeX source
            tex_path.write_text(latex_source, encoding='utf-8')
            
            try:
                # Run pdflatex twice for proper rendering
                for _ in range(2):
                    result = subprocess.run(
                        ["pdflatex", "-interaction=nonstopmode", "-output-directory", tmpdir, str(tex_path)],
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                
                if pdf_path.exists():
                    return pdf_path.read_bytes()
                else:
                    print(f"LaTeX compilation failed: {result.stderr}")
                    return None
                    
            except subprocess.TimeoutExpired:
                print("LaTeX compilation timed out")
                return None
            except FileNotFoundError:
                print("pdflatex not found. Please install a LaTeX distribution.")
                return None
            except Exception as e:
                print(f"LaTeX compilation error: {e}")
                return None
    
    def render_and_compile(self, resume: Resume) -> tuple[str, Optional[str]]:
        """Render to LaTeX and compile to PDF, returns (latex, base64_pdf)"""
        latex = self.render(resume)
        pdf_bytes = self.compile_to_pdf(latex)
        
        pdf_base64 = None
        if pdf_bytes:
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return latex, pdf_base64
    
    def _escape_latex(self, text: str) -> str:
        """Escape special LaTeX characters"""
        if not text:
            return ""
        
        replacements = [
            ('\\', r'\textbackslash{}'),
            ('&', r'\&'),
            ('%', r'\%'),
            ('$', r'\$'),
            ('#', r'\#'),
            ('_', r'\_'),
            ('{', r'\{'),
            ('}', r'\}'),
            ('~', r'\textasciitilde{}'),
            ('^', r'\textasciicircum{}'),
        ]
        
        for old, new in replacements:
            text = text.replace(old, new)
        
        return text
    
    def _get_preamble(self) -> str:
        """LaTeX document preamble"""
        return r"""\documentclass[11pt,a4paper]{article}

% Packages
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage[margin=0.75in]{geometry}
\usepackage{hyperref}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{xcolor}
\usepackage{fontawesome5}

% Colors
\definecolor{primary}{RGB}{0, 82, 147}
\definecolor{secondary}{RGB}{100, 100, 100}

% Remove page numbers
\pagestyle{empty}

% Section formatting
\titleformat{\section}{\large\bfseries\color{primary}}{}{0em}{}[\titlerule]
\titlespacing*{\section}{0pt}{12pt}{6pt}

% Hyperlink styling
\hypersetup{
    colorlinks=true,
    linkcolor=primary,
    urlcolor=primary
}

% Compact lists
\setlist[itemize]{leftmargin=*, nosep, topsep=0pt}

% Custom commands
\newcommand{\resumeEntry}[4]{
    \textbf{#1} \hfill #2 \\
    \textit{#3} \hfill \textit{#4}
}

\begin{document}

"""
    
    def _render_header(self, metadata) -> str:
        """Render resume header with contact info"""
        name = self._escape_latex(metadata.name)
        
        header = rf"""
\begin{{center}}
    {{\Huge\bfseries {name}}}
    
    \vspace{{4pt}}
    
"""
        
        contact_parts = []
        
        if metadata.location:
            contact_parts.append(rf"\faMapMarker*\ {self._escape_latex(metadata.location)}")
        
        if metadata.phone:
            contact_parts.append(rf"\faPhone*\ {self._escape_latex(metadata.phone)}")
        
        if metadata.email:
            email = self._escape_latex(metadata.email)
            contact_parts.append(rf"\faEnvelope\ \href{{mailto:{email}}}{{{email}}}")
        
        if metadata.linkedin:
            linkedin = self._escape_latex(metadata.linkedin)
            contact_parts.append(rf"\faLinkedin\ \href{{https://{linkedin}}}{{{linkedin}}}")
        
        if metadata.github:
            github = self._escape_latex(metadata.github)
            contact_parts.append(rf"\faGithub\ \href{{https://{github}}}{{{github}}}")
        
        if metadata.website:
            website = self._escape_latex(metadata.website)
            contact_parts.append(rf"\faGlobe\ \href{{https://{website}}}{{{website}}}")
        
        if contact_parts:
            header += "    " + " $\\cdot$ ".join(contact_parts) + "\n"
        
        header += r"""
\end{center}

\vspace{-8pt}

"""
        return header
    
    def _render_section(self, section: ResumeSection) -> str:
        """Render a resume section"""
        title = self._escape_latex(section.title)
        latex = rf"\section{{{title}}}" + "\n\n"
        
        for item in sorted(section.items, key=lambda i: i.order):
            latex += self._render_item(item, section.type)
        
        return latex + "\n"
    
    def _render_item(self, item: SectionItem, section_type: SectionType) -> str:
        """Render a section item based on its type"""
        content = item.content
        
        if isinstance(content, ExperienceItem) or (hasattr(content, 'type') and content.type == 'experience'):
            return self._render_experience_item(content)
        elif isinstance(content, EducationItem) or (hasattr(content, 'type') and content.type == 'education'):
            return self._render_education_item(content)
        elif isinstance(content, SkillsItem) or (hasattr(content, 'type') and content.type == 'skills'):
            return self._render_skills_item(content)
        elif isinstance(content, SummaryItem) or (hasattr(content, 'type') and content.type == 'summary'):
            return self._render_summary_item(content)
        elif isinstance(content, ProjectItem) or (hasattr(content, 'type') and content.type == 'project'):
            return self._render_project_item(content)
        else:
            return self._render_custom_item(content)
    
    def _render_experience_item(self, item) -> str:
        """Render an experience entry"""
        company = self._escape_latex(item.company) if item.company else ""
        role = self._escape_latex(item.role)
        location = self._escape_latex(item.location) if item.location else ""
        
        start_date = self._escape_latex(item.start_date) if item.start_date else ""
        end_date = self._escape_latex(item.end_date) if item.end_date else "Present"
        date_range = f"{start_date} -- {end_date}" if start_date else end_date
        
        latex = rf"""
\textbf{{{role}}} \hfill {date_range} \\
\textit{{{company}}} \hfill \textit{{{location}}}
"""
        
        if item.bullets:
            latex += r"\begin{itemize}" + "\n"
            for bullet in sorted(item.bullets, key=lambda b: b.order):
                text = self._escape_latex(bullet.text)
                latex += rf"    \item {text}" + "\n"
            latex += r"\end{itemize}" + "\n"
        
        latex += r"\vspace{4pt}" + "\n\n"
        return latex
    
    def _render_education_item(self, item) -> str:
        """Render an education entry"""
        institution = self._escape_latex(item.institution)
        degree = self._escape_latex(item.degree)
        field = self._escape_latex(item.field) if item.field else ""
        location = self._escape_latex(item.location) if item.location else ""
        end_date = self._escape_latex(item.end_date) if item.end_date else ""
        
        degree_line = degree
        if field:
            degree_line += f" in {field}"
        
        latex = rf"""
\textbf{{{institution}}} \hfill {location} \\
\textit{{{degree_line}}} \hfill \textit{{{end_date}}}
"""
        
        if item.gpa:
            gpa = self._escape_latex(item.gpa)
            latex += rf"\\ GPA: {gpa}" + "\n"
        
        if item.bullets:
            latex += r"\begin{itemize}" + "\n"
            for bullet in sorted(item.bullets, key=lambda b: b.order):
                text = self._escape_latex(bullet.text)
                latex += rf"    \item {text}" + "\n"
            latex += r"\end{itemize}" + "\n"
        
        latex += r"\vspace{4pt}" + "\n\n"
        return latex
    
    def _render_skills_item(self, item) -> str:
        """Render skills categories"""
        latex = ""
        
        for category in item.categories:
            name = self._escape_latex(category.name)
            skills = ", ".join([self._escape_latex(s) for s in category.skills])
            latex += rf"\textbf{{{name}:}} {skills}" + r" \\" + "\n"
        
        latex += r"\vspace{4pt}" + "\n\n"
        return latex
    
    def _render_summary_item(self, item) -> str:
        """Render summary/objective"""
        text = self._escape_latex(item.text)
        return text + "\n\n" + r"\vspace{4pt}" + "\n\n"
    
    def _render_project_item(self, item) -> str:
        """Render a project entry"""
        name = self._escape_latex(item.name)
        
        latex = rf"\textbf{{{name}}}"
        
        if item.technologies:
            techs = ", ".join([self._escape_latex(t) for t in item.technologies])
            latex += rf" \textit{{({techs})}}"
        
        if item.url:
            url = self._escape_latex(item.url)
            latex += rf" -- \href{{{url}}}{{{url}}}"
        
        latex += "\n"
        
        if item.description:
            desc = self._escape_latex(item.description)
            latex += rf"\\ {desc}" + "\n"
        
        if item.bullets:
            latex += r"\begin{itemize}" + "\n"
            for bullet in sorted(item.bullets, key=lambda b: b.order):
                text = self._escape_latex(bullet.text)
                latex += rf"    \item {text}" + "\n"
            latex += r"\end{itemize}" + "\n"
        
        latex += r"\vspace{4pt}" + "\n\n"
        return latex
    
    def _render_custom_item(self, item) -> str:
        """Render a custom section item"""
        latex = ""
        
        if hasattr(item, 'title') and item.title:
            latex += rf"\textbf{{{self._escape_latex(item.title)}}}"
            
            if hasattr(item, 'date_range') and item.date_range:
                latex += rf" \hfill {self._escape_latex(item.date_range)}"
            
            latex += "\n"
        
        if hasattr(item, 'subtitle') and item.subtitle:
            latex += rf"\textit{{{self._escape_latex(item.subtitle)}}}"
            
            if hasattr(item, 'location') and item.location:
                latex += rf" \hfill \textit{{{self._escape_latex(item.location)}}}"
            
            latex += "\n"
        
        if hasattr(item, 'bullets') and item.bullets:
            latex += r"\begin{itemize}" + "\n"
            for bullet in sorted(item.bullets, key=lambda b: b.order):
                text = self._escape_latex(bullet.text)
                latex += rf"    \item {text}" + "\n"
            latex += r"\end{itemize}" + "\n"
        
        latex += r"\vspace{4pt}" + "\n\n"
        return latex
    
    def _get_footer(self) -> str:
        """LaTeX document footer"""
        return r"""
\end{document}
"""
