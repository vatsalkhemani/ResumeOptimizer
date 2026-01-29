"""
PDF Renderer Service - Converts Resume model to PDF using ReportLab
No external installations required - works out of the box on Windows, Mac, and Linux
"""
import base64
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER

from app.models.resume import Resume, ResumeSection, SectionItem


class PDFRenderer:
    """Renders Resume model to PDF using ReportLab"""
    
    def __init__(self):
        self.styles = self._create_styles()
    
    def _create_styles(self):
        """Create custom paragraph styles for the resume"""
        styles = getSampleStyleSheet()
        
        # Name style
        styles.add(ParagraphStyle(
            name='ResumeName',
            fontSize=18,
            fontName='Helvetica-Bold',
            alignment=TA_CENTER,
            spaceAfter=6,
            textColor=HexColor('#1a1a1a')
        ))
        
        # Contact style
        styles.add(ParagraphStyle(
            name='Contact',
            fontSize=9,
            fontName='Helvetica',
            alignment=TA_CENTER,
            spaceAfter=12,
            textColor=HexColor('#4b5563')
        ))
        
        # Section title
        styles.add(ParagraphStyle(
            name='SectionTitle',
            fontSize=10,
            fontName='Helvetica-Bold',
            spaceAfter=6,
            spaceBefore=10,
            textColor=HexColor('#1a1a1a'),
        ))
        
        # Entry title (company/institution)
        styles.add(ParagraphStyle(
            name='EntryTitle',
            fontSize=10,
            fontName='Helvetica-Bold',
            spaceAfter=1,
            textColor=HexColor('#1a1a1a')
        ))
        
        # Entry subtitle
        styles.add(ParagraphStyle(
            name='EntrySubtitle',
            fontSize=9,
            fontName='Helvetica-Oblique',
            spaceAfter=3,
            textColor=HexColor('#4b5563')
        ))
        
        # Bullet point
        styles.add(ParagraphStyle(
            name='ResumeBullet',
            fontSize=9,
            fontName='Helvetica',
            leftIndent=12,
            spaceAfter=2,
            textColor=HexColor('#374151'),
        ))
        
        # Summary text
        styles.add(ParagraphStyle(
            name='Summary',
            fontSize=9,
            fontName='Helvetica',
            spaceAfter=6,
            textColor=HexColor('#374151'),
            leading=12
        ))
        
        # Skills
        styles.add(ParagraphStyle(
            name='Skills',
            fontSize=9,
            fontName='Helvetica',
            spaceAfter=3,
            textColor=HexColor('#374151')
        ))
        
        return styles
    
    def render_pdf(self, resume: Resume) -> bytes:
        """Convert Resume model to PDF bytes"""
        buffer = BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=0.6*inch,
            rightMargin=0.6*inch,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch
        )
        
        story = []
        
        # Add header
        story.extend(self._build_header(resume.metadata))
        
        # Add sections
        for section in sorted(resume.sections, key=lambda s: s.order):
            story.extend(self._build_section(section))
        
        doc.build(story)
        return buffer.getvalue()
    
    def render_pdf_base64(self, resume: Resume) -> str:
        """Convert Resume model to base64-encoded PDF"""
        pdf_bytes = self.render_pdf(resume)
        return base64.b64encode(pdf_bytes).decode('utf-8')
    
    def _escape(self, text: str) -> str:
        """Escape text for ReportLab paragraphs"""
        if not text:
            return ""
        return (text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;"))
    
    def _get_attr(self, obj, attr, default=None):
        """Safely get attribute from object or dict"""
        if isinstance(obj, dict):
            return obj.get(attr, default)
        return getattr(obj, attr, default)
    
    def _build_header(self, metadata) -> list:
        """Build the header section with name and contact info"""
        elements = []
        
        # Name
        name = self._escape(self._get_attr(metadata, 'name', ''))
        elements.append(Paragraph(name, self.styles['ResumeName']))
        
        # Contact info
        contact_parts = []
        for field in ['location', 'phone', 'email', 'linkedin', 'github', 'website']:
            value = self._get_attr(metadata, field, '')
            if value:
                contact_parts.append(self._escape(value))
        
        if contact_parts:
            contact_text = "  •  ".join(contact_parts)
            elements.append(Paragraph(contact_text, self.styles['Contact']))
        
        elements.append(Spacer(1, 4))
        return elements
    
    def _build_section(self, section: ResumeSection) -> list:
        """Build a resume section"""
        elements = []
        
        # Section title
        title = self._escape(self._get_attr(section, 'title', '').upper())
        elements.append(Paragraph(f"<u>{title}</u>", self.styles['SectionTitle']))
        
        # Section items
        items = self._get_attr(section, 'items', [])
        sorted_items = sorted(items, key=lambda i: self._get_attr(i, 'order', 0))
        for item in sorted_items:
            elements.extend(self._build_item(item))
        
        return elements
    
    def _build_item(self, item: SectionItem) -> list:
        """Build a section item based on its type"""
        content = self._get_attr(item, 'content', item)
        item_type = self._get_attr(content, 'type', 'custom')
        
        if item_type == 'experience':
            return self._build_experience_item(content)
        elif item_type == 'education':
            return self._build_education_item(content)
        elif item_type == 'skills':
            return self._build_skills_item(content)
        elif item_type == 'summary':
            return self._build_summary_item(content)
        elif item_type == 'project':
            return self._build_project_item(content)
        else:
            return self._build_custom_item(content)
    
    def _build_experience_item(self, item) -> list:
        """Build an experience entry"""
        elements = []
        
        role = self._escape(self._get_attr(item, 'role', ''))
        start_date = self._escape(self._get_attr(item, 'start_date', ''))
        end_date = self._escape(self._get_attr(item, 'end_date', '') or 'Present')
        date_range = f"{start_date} – {end_date}" if start_date else end_date
        
        title_text = f"<b>{role}</b> <i>({date_range})</i>"
        elements.append(Paragraph(title_text, self.styles['EntryTitle']))
        
        # Company and location
        company = self._escape(self._get_attr(item, 'company', ''))
        location = self._escape(self._get_attr(item, 'location', ''))
        subtitle = company + (f", {location}" if location else "")
        if subtitle:
            elements.append(Paragraph(subtitle, self.styles['EntrySubtitle']))
        
        # Bullets
        bullets = self._get_attr(item, 'bullets', [])
        for bullet in sorted(bullets, key=lambda b: self._get_attr(b, 'order', 0)):
            text = self._escape(self._get_attr(bullet, 'text', ''))
            elements.append(Paragraph(f"•  {text}", self.styles['ResumeBullet']))
        
        elements.append(Spacer(1, 6))
        return elements
    
    def _build_education_item(self, item) -> list:
        """Build an education entry"""
        elements = []
        
        institution = self._escape(self._get_attr(item, 'institution', ''))
        end_date = self._escape(self._get_attr(item, 'end_date', ''))
        
        title_text = f"<b>{institution}</b>" + (f" <i>({end_date})</i>" if end_date else "")
        elements.append(Paragraph(title_text, self.styles['EntryTitle']))
        
        degree = self._escape(self._get_attr(item, 'degree', ''))
        field = self._escape(self._get_attr(item, 'field', ''))
        degree_text = degree + (f" in {field}" if field else "")
        
        gpa = self._get_attr(item, 'gpa', '')
        if gpa:
            degree_text += f" | GPA: {self._escape(gpa)}"
        
        elements.append(Paragraph(degree_text, self.styles['EntrySubtitle']))
        elements.append(Spacer(1, 4))
        
        return elements
    
    def _build_skills_item(self, item) -> list:
        """Build skills categories"""
        elements = []
        
        categories = self._get_attr(item, 'categories', [])
        for category in categories:
            cat_name = self._escape(self._get_attr(category, 'name', 'Skills'))
            cat_skills = self._get_attr(category, 'skills', [])
            skills = ", ".join([self._escape(s) for s in cat_skills])
            elements.append(Paragraph(f"<b>{cat_name}:</b> {skills}", self.styles['Skills']))
        
        return elements
    
    def _build_summary_item(self, item) -> list:
        """Build summary/objective"""
        text = self._escape(self._get_attr(item, 'text', ''))
        return [Paragraph(text, self.styles['Summary'])]
    
    def _build_project_item(self, item) -> list:
        """Build a project entry"""
        elements = []
        
        name = self._escape(self._get_attr(item, 'name', ''))
        title_text = f"<b>{name}</b>"
        
        technologies = self._get_attr(item, 'technologies', [])
        if technologies:
            techs = ", ".join([self._escape(t) for t in technologies])
            title_text += f" <i>({techs})</i>"
        
        elements.append(Paragraph(title_text, self.styles['EntryTitle']))
        
        bullets = self._get_attr(item, 'bullets', [])
        for bullet in sorted(bullets, key=lambda b: self._get_attr(b, 'order', 0)):
            text = self._escape(self._get_attr(bullet, 'text', ''))
            elements.append(Paragraph(f"•  {text}", self.styles['ResumeBullet']))
        
        elements.append(Spacer(1, 4))
        return elements
    
    def _build_custom_item(self, item) -> list:
        """Build a custom section item"""
        elements = []
        
        title = self._get_attr(item, 'title', '')
        if title:
            elements.append(Paragraph(f"<b>{self._escape(title)}</b>", self.styles['EntryTitle']))
        
        bullets = self._get_attr(item, 'bullets', [])
        for bullet in sorted(bullets, key=lambda b: self._get_attr(b, 'order', 0)):
            text = self._escape(self._get_attr(bullet, 'text', ''))
            elements.append(Paragraph(f"•  {text}", self.styles['ResumeBullet']))
        
        return elements
