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
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from app.models.resume import Resume, ResumeSection, SectionItem


class PDFRenderer:
    """Renders Resume model to PDF using ReportLab"""
    
    def __init__(self):
        self.width = letter[0]
        self.margin = 0.75 * inch
        self.content_width = self.width - (2 * self.margin)
        self.styles = self._create_styles()
    
    def _create_styles(self):
        """Create custom paragraph styles for the resume"""
        styles = getSampleStyleSheet()
        
        # Name style (Merriweather 24pt Bold -> Times-Bold 24)
        styles.add(ParagraphStyle(
            name='ResumeName',
            fontSize=24,
            fontName='Times-Bold',
            alignment=TA_CENTER,
            spaceAfter=12,
            textColor=HexColor('#111111'),
            leading=28,
            textTransform='uppercase'
        ))
        
        # Contact style (Open Sans 9pt -> Helvetica 9)
        styles.add(ParagraphStyle(
            name='Contact',
            fontSize=9,
            fontName='Helvetica',
            alignment=TA_CENTER,
            spaceAfter=18,
            textColor=HexColor('#555555')
        ))
        
        # Section title (Times-Bold 11, line handled by Table)
        styles.add(ParagraphStyle(
            name='SectionTitle',
            fontSize=11,
            fontName='Times-Bold',
            spaceAfter=0, # Spacing handled by table
            spaceBefore=0,
            textColor=HexColor('#333333'),
            textTransform='uppercase', 
        ))
        
        # Entry title (Role) (Times-Bold 11)
        styles.add(ParagraphStyle(
            name='EntryTitle',
            fontSize=11,
            fontName='Times-Bold',
            spaceAfter=0,
            textColor=HexColor('#000000')
        ))
        
        # Entry Date (Times-Italic 10, Right)
        styles.add(ParagraphStyle(
            name='EntryDate',
            fontSize=10,
            fontName='Times-Italic',
            alignment=TA_RIGHT,
            textColor=HexColor('#666666')
        ))
        
        # Entry subtitle (Company) (Times-Italic 10)
        styles.add(ParagraphStyle(
            name='EntrySubtitle',
            fontSize=10,
            fontName='Times-Italic',
            spaceAfter=0,
            textColor=HexColor('#444444')
        ))

        # Entry Location (Times-Italic 10, Right)
        styles.add(ParagraphStyle(
            name='EntryLocation',
            fontSize=10,
            fontName='Times-Italic',
            alignment=TA_RIGHT,
            textColor=HexColor('#444444')
        ))
        
        # Bullet point (Times-Roman 10)
        styles.add(ParagraphStyle(
            name='ResumeBullet',
            fontSize=10,
            fontName='Times-Roman',
            leftIndent=12,
            spaceAfter=3,
            textColor=HexColor('#1a1a1a'),
            leading=13 
        ))
        
        # Summary text
        styles.add(ParagraphStyle(
            name='Summary',
            fontSize=10,
            fontName='Times-Roman',
            spaceAfter=8,
            textColor=HexColor('#1a1a1a'),
            leading=15
        ))
        
        # Skills
        styles.add(ParagraphStyle(
            name='Skills',
            fontSize=10,
            fontName='Times-Roman',
            spaceAfter=3,
            textColor=HexColor('#1a1a1a'),
            leading=14
        ))
        
        return styles
    
    def render_pdf(self, resume: Resume) -> bytes:
        """Convert Resume model to PDF bytes"""
        buffer = BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=0.75*inch,
            rightMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
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
        return (str(text)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;"))

    def _parse_markdown(self, text):
        """Parse basic markdown (**bold**) to ReportLab XML"""
        if not text:
            return ""
        # First escape HTML
        safe_text = self._escape(text)
        # Replace **text** with <b>text</b>
        import re
        return re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', safe_text)
    
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
                escaped_value = self._escape(value)
                # Create links for email and URLs
                if field == 'email':
                    contact_parts.append(f'<a href="mailto:{escaped_value}">{escaped_value}</a>')
                elif field in ['linkedin', 'github', 'website'] or value.startswith('http') or 'linkedin.com' in value:
                    url = escaped_value
                    if not url.startswith('http'):
                        url = 'https://' + url
                    # Display simpler text for long URLs? No, user usually wants the text to be the link
                    contact_parts.append(f'<a href="{url}" color="blue">{escaped_value}</a>')
                else:
                    contact_parts.append(escaped_value)
        
        if contact_parts:
            # Join with dot separator
            contact_text = "  •  ".join(contact_parts)
            elements.append(Paragraph(contact_text, self.styles['Contact']))
        
        elements.append(Spacer(1, 4))
        return elements
    
    def _build_section(self, section: ResumeSection) -> list:
        """Build a resume section"""
        elements = []
        
        # Section title
        title = self._escape(self._get_attr(section, 'title', '').upper())
        # Use Table for full width border
        t = Table([[Paragraph(title, self.styles['SectionTitle'])]], colWidths=[self.content_width])
        t.setStyle(TableStyle([
            ('LINEBELOW', (0, 0), (-1, -1), 1, HexColor('#111111')),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 12))
        
        # Section items
        items = self._get_attr(section, 'items', [])
        print(f"DEBUG: Processing Section '{self._get_attr(section, 'title', 'UNKNOWN')}'")
        print(f"DEBUG: Item Count: {len(items)}")
        
        sorted_items = sorted(items, key=lambda i: self._get_attr(i, 'order', 0))
        for item in sorted_items:
            elements.extend(self._build_item(item))
        
        return elements
    
    def _build_item(self, item: SectionItem) -> list:
        """Build a section item based on its type"""
        content = self._get_attr(item, 'content', item)
        item_type = self._get_attr(content, 'type', 'custom')
        print(f"DEBUG: Building Item Type: {item_type}, Content: {content}")
        
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
        
        role = self._parse_markdown(self._get_attr(item, 'role', ''))
        start_date = self._parse_markdown(self._get_attr(item, 'start_date', ''))
        end_date = self._parse_markdown(self._get_attr(item, 'end_date', '') or 'Present')
        date_range = f"{start_date} – {end_date}" if start_date else end_date
        
        # Header Row: Role (Left) - Date (Right)
        header_data = [[
            Paragraph(role, self.styles['EntryTitle']),
            Paragraph(date_range, self.styles['EntryDate'])
        ]]
        t_header = Table(header_data, colWidths=[self.content_width * 0.75, self.content_width * 0.25])
        t_header.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        elements.append(t_header)

        # Company and location
        company = self._parse_markdown(self._get_attr(item, 'company', ''))
        location = self._parse_markdown(self._get_attr(item, 'location', ''))
        
        if company or location:
            sub_data = [[
                Paragraph(company, self.styles['EntrySubtitle']),
                Paragraph(location, self.styles['EntryLocation'])
            ]]
            t_sub = Table(sub_data, colWidths=[self.content_width * 0.75, self.content_width * 0.25])
            t_sub.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2), # Small space after subtitle
            ]))
            elements.append(t_sub)
        
        # Bullets
        bullets = self._get_attr(item, 'bullets', [])
        for bullet in sorted(bullets, key=lambda b: self._get_attr(b, 'order', 0)):
            text = self._parse_markdown(self._get_attr(bullet, 'text', ''))
            elements.append(Paragraph(f"•  {text}", self.styles['ResumeBullet']))
        
        elements.append(Spacer(1, 8))
        return elements
    
    def _build_education_item(self, item) -> list:
        """Build an education entry flowable"""
        elements = []
        
        institution = self._escape(self._get_attr(item, 'institution', ''))
        end_date = self._escape(self._get_attr(item, 'end_date', ''))
        
        # Header Row: Institution (Left) - Date (Right)
        header_data = [[
            Paragraph(institution, self.styles['EntryTitle']),
            Paragraph(end_date, self.styles['EntryDate'])
        ]]
        t_header = Table(header_data, colWidths=[self.content_width * 0.75, self.content_width * 0.25])
        t_header.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        elements.append(t_header)
        
        degree = self._escape(self._get_attr(item, 'degree', ''))
        field = self._escape(self._get_attr(item, 'field', ''))
        degree_text = degree + (f" in {field}" if field else "")
        
        gpa = self._get_attr(item, 'gpa', '')
        if gpa:
            degree_text += f" | GPA: {self._escape(gpa)}"
        
        elements.append(Paragraph(degree_text, self.styles['EntrySubtitle']))
        elements.append(Spacer(1, 6))
        

        # Bullets
        bullets = self._get_attr(item, 'bullets', [])
        for bullet in sorted(bullets, key=lambda b: self._get_attr(b, 'order', 0)):
            text = self._parse_markdown(self._get_attr(bullet, 'text', ''))
            elements.append(Paragraph(f"•  {text}", self.styles['ResumeBullet']))
            
        return elements
    
    def _build_skills_item(self, item) -> list:
        """Build skills categories"""
        elements = []
        
        categories = self._get_attr(item, 'categories', [])
        for category in categories:
            cat_name = self._parse_markdown(self._get_attr(category, 'name', 'Skills'))
            cat_skills = self._get_attr(category, 'skills', [])
            skills = ", ".join([self._parse_markdown(s) for s in cat_skills])
            elements.append(Paragraph(f"<b>{cat_name}:</b> {skills}", self.styles['Skills']))
        
        return elements
    
    def _build_summary_item(self, item) -> list:
        """Build summary/objective"""
        text = self._escape(self._get_attr(item, 'text', ''))
        return [Paragraph(text, self.styles['Summary'])]
    
    def _build_project_item(self, item) -> list:
        """Build a project entry"""
        elements = []
        
        name = self._parse_markdown(self._get_attr(item, 'name', ''))
        title_text = f"<b>{name}</b>"
        
        technologies = self._get_attr(item, 'technologies', [])
        if technologies:
            if isinstance(technologies, str):
                techs = self._escape(technologies)
            else:
                techs = ", ".join([self._escape(t) for t in technologies])
            title_text += f" <i>({techs})</i>"
        
        elements.append(Paragraph(title_text, self.styles['EntryTitle']))
        
        # Add description if present
        description = self._parse_markdown(self._get_attr(item, 'description', ''))
        if description:
            elements.append(Paragraph(description, self.styles['ResumeBullet'])) # Reuse bullet style (or Summary if needed)

        bullets = self._get_attr(item, 'bullets', [])
        for bullet in sorted(bullets, key=lambda b: self._get_attr(b, 'order', 0)):
            text = self._parse_markdown(self._get_attr(bullet, 'text', ''))
            elements.append(Paragraph(f"•  {text}", self.styles['ResumeBullet']))
        
        elements.append(Spacer(1, 4))
        return elements
    
    def _build_custom_item(self, item) -> list:
        elements = []
        
        title = self._get_attr(item, 'title', '')
        subtitle = self._get_attr(item, 'subtitle', '')
        date_range = self._get_attr(item, 'date_range', '')
        location = self._get_attr(item, 'location', '')
        
        # Row 1: Title | Date
        header_data = [
            [Paragraph(self._parse_markdown(title), self.styles['EntryTitle']),
             Paragraph(self._parse_markdown(date_range), self.styles['EntryDate'])]
        ]
        t1 = Table(header_data, colWidths=[5.5*inch, 1.5*inch])
        t1.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(t1)
        
        # Row 2: Subtitle | Location (if present)
        if subtitle or location:
            sub_data = [
                [Paragraph(self._parse_markdown(subtitle), self.styles['EntrySubtitle']),
                 Paragraph(self._parse_markdown(location), self.styles['EntryDate'])] # Recycle EntryDate style for location alignment
            ]
            t2 = Table(sub_data, colWidths=[5.5*inch, 1.5*inch])
            t2.setStyle(TableStyle([
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ]))
            elements.append(t2)
        
        # Bullets
        bullets = self._get_attr(item, 'bullets', [])
        if bullets:
            for bullet in sorted(bullets, key=lambda b: self._get_attr(b, 'order', 0)):
                text = self._parse_markdown(self._get_attr(bullet, 'text', ''))
                if text:
                    elements.append(Paragraph(text, self.styles['ResumeBullet'], bulletText='•'))
        
        # Fallback text description if no bullets
        text = self._get_attr(item, 'text', '')
        if text and not bullets:
             elements.append(Paragraph(self._parse_markdown(text), self.styles['BodyText']))
             
        elements.append(Spacer(1, 4))
        return elements
