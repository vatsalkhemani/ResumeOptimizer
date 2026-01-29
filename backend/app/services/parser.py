"""
Resume Parser Service - Extracts structured data from PDF and DOCX files
"""
import fitz  # PyMuPDF
from docx import Document
import re
from typing import Optional
import uuid

from app.models.resume import (
    Resume, ResumeMetadata, ResumeSection, SectionItem,
    ExperienceItem, EducationItem, SkillsItem, SummaryItem,
    ProjectItem, Bullet, SkillCategory, SectionType
)


class ResumeParser:
    """Parses PDF and DOCX resumes into structured Resume model"""
    
    # Common section headers to identify sections
    SECTION_PATTERNS = {
        SectionType.SUMMARY: r"(?i)^(summary|profile|objective|about\s*me|professional\s*summary)",
        SectionType.EXPERIENCE: r"(?i)^(experience|work\s*experience|employment|professional\s*experience|work\s*history)",
        SectionType.EDUCATION: r"(?i)^(education|academic|qualifications|schooling)",
        SectionType.SKILLS: r"(?i)^(skills|technical\s*skills|core\s*competencies|technologies|expertise)",
        SectionType.PROJECTS: r"(?i)^(projects|personal\s*projects|key\s*projects)",
        SectionType.CERTIFICATIONS: r"(?i)^(certifications|certificates|licenses|credentials)",
    }
    
    # Email and phone patterns
    EMAIL_PATTERN = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    PHONE_PATTERN = r"[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}"
    LINKEDIN_PATTERN = r"(?:linkedin\.com/in/|linkedin:?\s*)([a-zA-Z0-9_-]+)"
    GITHUB_PATTERN = r"(?:github\.com/|github:?\s*)([a-zA-Z0-9_-]+)"
    
    # Date patterns
    DATE_PATTERN = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|(?:\d{1,2}/\d{4})|(?:\d{4})"
    DATE_RANGE_PATTERN = rf"({DATE_PATTERN})\s*[-–—to]+\s*({DATE_PATTERN}|Present|Current)"

    def parse_pdf(self, file_bytes: bytes) -> tuple[Resume, list[str]]:
        """Parse PDF file and return Resume model with warnings"""
        warnings = []
        
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            text_blocks = []
            
            for page in doc:
                blocks = page.get_text("blocks")
                for block in blocks:
                    if block[6] == 0:  # Text block
                        text_blocks.append({
                            "text": block[4].strip(),
                            "y": block[1],
                            "x": block[0]
                        })
            
            # Sort by vertical position
            text_blocks.sort(key=lambda b: (b["y"], b["x"]))
            
            # Extract all text
            full_text = "\n".join([b["text"] for b in text_blocks])
            lines = [b["text"] for b in text_blocks if b["text"]]
            
            doc.close()
            
        except Exception as e:
            warnings.append(f"PDF parsing error: {str(e)}")
            return self._create_empty_resume(), warnings
        
        return self._parse_text(lines, full_text, warnings)

    def parse_docx(self, file_bytes: bytes) -> tuple[Resume, list[str]]:
        """Parse DOCX file and return Resume model with warnings"""
        warnings = []
        
        try:
            from io import BytesIO
            doc = Document(BytesIO(file_bytes))
            
            lines = []
            for para in doc.paragraphs:
                text = para.text.strip()
                if text:
                    lines.append(text)
            
            full_text = "\n".join(lines)
            
        except Exception as e:
            warnings.append(f"DOCX parsing error: {str(e)}")
            return self._create_empty_resume(), warnings
        
        return self._parse_text(lines, full_text, warnings)

    def _parse_text(self, lines: list[str], full_text: str, warnings: list[str]) -> tuple[Resume, list[str]]:
        """Parse extracted text into Resume structure"""
        
        # Extract contact info
        metadata = self._extract_metadata(lines, full_text)
        
        # Identify and parse sections
        sections = self._extract_sections(lines, full_text)
        
        resume = Resume(
            id=str(uuid.uuid4()),
            metadata=metadata,
            sections=sections,
            version=1
        )
        
        if not sections:
            warnings.append("Could not identify any sections. Manual editing may be required.")
        
        return resume, warnings

    def _extract_metadata(self, lines: list[str], full_text: str) -> ResumeMetadata:
        """Extract contact information from resume text"""
        
        # Name is typically the first significant line
        name = "Unknown"
        for line in lines[:5]:
            # Skip lines that look like contact info
            if "@" in line or re.search(self.PHONE_PATTERN, line):
                continue
            # Skip very short lines
            if len(line) > 2 and not re.search(r"^\d", line):
                name = line
                break
        
        # Extract email
        email_match = re.search(self.EMAIL_PATTERN, full_text)
        email = email_match.group(0) if email_match else None
        
        # Extract phone
        phone_match = re.search(self.PHONE_PATTERN, full_text)
        phone = phone_match.group(0) if phone_match else None
        
        # Extract LinkedIn
        linkedin_match = re.search(self.LINKEDIN_PATTERN, full_text, re.IGNORECASE)
        linkedin = f"linkedin.com/in/{linkedin_match.group(1)}" if linkedin_match else None
        
        # Extract GitHub
        github_match = re.search(self.GITHUB_PATTERN, full_text, re.IGNORECASE)
        github = f"github.com/{github_match.group(1)}" if github_match else None
        
        # Try to extract location (usually near the top, contains city/state)
        location = None
        location_patterns = [
            r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})",  # City, ST
            r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+)",  # City, State
        ]
        for pattern in location_patterns:
            for line in lines[:10]:
                match = re.search(pattern, line)
                if match:
                    location = match.group(1)
                    break
            if location:
                break
        
        return ResumeMetadata(
            name=name,
            email=email,
            phone=phone,
            linkedin=linkedin,
            github=github,
            location=location
        )

    def _extract_sections(self, lines: list[str], full_text: str) -> list[ResumeSection]:
        """Identify and parse resume sections"""
        sections = []
        current_section_type = None
        current_section_title = None
        current_section_lines = []
        section_order = 0
        
        for i, line in enumerate(lines):
            # Check if this line is a section header
            matched_type = None
            for section_type, pattern in self.SECTION_PATTERNS.items():
                if re.match(pattern, line.strip()):
                    matched_type = section_type
                    break
            
            if matched_type:
                # Save previous section if exists
                if current_section_type and current_section_lines:
                    section = self._parse_section(
                        current_section_type,
                        current_section_title,
                        current_section_lines,
                        section_order
                    )
                    if section:
                        sections.append(section)
                        section_order += 1
                
                # Start new section
                current_section_type = matched_type
                current_section_title = line.strip()
                current_section_lines = []
            elif current_section_type:
                current_section_lines.append(line)
        
        # Don't forget the last section
        if current_section_type and current_section_lines:
            section = self._parse_section(
                current_section_type,
                current_section_title,
                current_section_lines,
                section_order
            )
            if section:
                sections.append(section)
        
        return sections

    def _parse_section(
        self, 
        section_type: SectionType, 
        title: str, 
        lines: list[str],
        order: int
    ) -> Optional[ResumeSection]:
        """Parse a specific section based on its type"""
        
        items = []
        
        if section_type == SectionType.EXPERIENCE:
            items = self._parse_experience_section(lines)
        elif section_type == SectionType.EDUCATION:
            items = self._parse_education_section(lines)
        elif section_type == SectionType.SKILLS:
            items = self._parse_skills_section(lines)
        elif section_type == SectionType.SUMMARY:
            items = self._parse_summary_section(lines)
        elif section_type == SectionType.PROJECTS:
            items = self._parse_projects_section(lines)
        else:
            # Generic parsing for other sections
            items = self._parse_generic_section(lines)
        
        if not items:
            return None
        
        return ResumeSection(
            id=str(uuid.uuid4()),
            type=section_type,
            title=title,
            order=order,
            items=items
        )

    def _parse_experience_section(self, lines: list[str]) -> list[SectionItem]:
        """Parse experience section into structured items"""
        items = []
        current_entry = None
        current_bullets = []
        item_order = 0
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if this is a bullet point
            if line.startswith(('•', '-', '–', '▪', '*', '○')) or re.match(r'^\d+\.', line):
                bullet_text = re.sub(r'^[•\-–▪*○]\s*|\d+\.\s*', '', line)
                if current_entry and bullet_text:
                    current_bullets.append(Bullet(
                        id=str(uuid.uuid4()),
                        text=bullet_text,
                        order=len(current_bullets)
                    ))
            else:
                # Check if this looks like a new job entry (has date range)
                date_match = re.search(self.DATE_RANGE_PATTERN, line, re.IGNORECASE)
                
                if date_match or self._looks_like_job_title(line):
                    # Save previous entry
                    if current_entry:
                        current_entry.bullets = current_bullets
                        items.append(SectionItem(
                            id=str(uuid.uuid4()),
                            order=item_order,
                            content=current_entry
                        ))
                        item_order += 1
                        current_bullets = []
                    
                    # Start new entry
                    current_entry = self._create_experience_entry(line, lines, date_match)
        
        # Save last entry
        if current_entry:
            current_entry.bullets = current_bullets
            items.append(SectionItem(
                id=str(uuid.uuid4()),
                order=item_order,
                content=current_entry
            ))
        
        return items

    def _looks_like_job_title(self, line: str) -> bool:
        """Check if a line looks like a job title or company name"""
        job_keywords = [
            r"engineer", r"developer", r"manager", r"director", r"analyst",
            r"designer", r"lead", r"senior", r"junior", r"intern", r"consultant",
            r"specialist", r"coordinator", r"associate", r"executive"
        ]
        for keyword in job_keywords:
            if re.search(keyword, line, re.IGNORECASE):
                return True
        return False

    def _create_experience_entry(self, line: str, all_lines: list[str], date_match) -> ExperienceItem:
        """Create an experience entry from parsed line"""
        start_date = ""
        end_date = None
        
        if date_match:
            start_date = date_match.group(1)
            end_match = date_match.group(2)
            end_date = None if end_match.lower() in ["present", "current"] else end_match
            # Remove dates from line for role/company extraction
            line = re.sub(self.DATE_RANGE_PATTERN, '', line, flags=re.IGNORECASE).strip()
        
        # Try to split role and company
        parts = re.split(r'\s+at\s+|\s+@\s+|\s*[|,]\s*', line, maxsplit=1)
        
        if len(parts) >= 2:
            role = parts[0].strip()
            company = parts[1].strip()
        else:
            role = line
            company = ""
        
        return ExperienceItem(
            company=company,
            role=role,
            start_date=start_date,
            end_date=end_date,
            bullets=[]
        )

    def _parse_education_section(self, lines: list[str]) -> list[SectionItem]:
        """Parse education section"""
        items = []
        current_text = []
        item_order = 0
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            current_text.append(line)
        
        # Simple parsing: treat combined text as one education entry
        if current_text:
            combined = " ".join(current_text)
            
            # Try to extract degree and institution
            institution = current_text[0] if current_text else "Unknown Institution"
            degree = current_text[1] if len(current_text) > 1 else "Degree"
            
            # Look for date
            end_date = "Unknown"
            date_match = re.search(self.DATE_PATTERN, combined)
            if date_match:
                end_date = date_match.group(0)
            
            items.append(SectionItem(
                id=str(uuid.uuid4()),
                order=item_order,
                content=EducationItem(
                    institution=institution,
                    degree=degree,
                    end_date=end_date,
                    bullets=[]
                )
            ))
        
        return items

    def _parse_skills_section(self, lines: list[str]) -> list[SectionItem]:
        """Parse skills section into categories"""
        categories = []
        
        all_skills = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if it's a category line (e.g., "Programming: Python, Java")
            if ':' in line:
                parts = line.split(':', 1)
                category_name = parts[0].strip()
                skills_text = parts[1].strip()
                skills = [s.strip() for s in re.split(r'[,;|]', skills_text) if s.strip()]
                if skills:
                    categories.append(SkillCategory(name=category_name, skills=skills))
            else:
                # Just a list of skills
                skills = [s.strip() for s in re.split(r'[,;|•\-]', line) if s.strip()]
                all_skills.extend(skills)
        
        # If no categories found, create a generic one
        if not categories and all_skills:
            categories.append(SkillCategory(name="Technical Skills", skills=all_skills))
        
        if categories:
            return [SectionItem(
                id=str(uuid.uuid4()),
                order=0,
                content=SkillsItem(categories=categories)
            )]
        
        return []

    def _parse_summary_section(self, lines: list[str]) -> list[SectionItem]:
        """Parse summary/objective section"""
        text = " ".join([l.strip() for l in lines if l.strip()])
        
        if text:
            return [SectionItem(
                id=str(uuid.uuid4()),
                order=0,
                content=SummaryItem(text=text)
            )]
        
        return []

    def _parse_projects_section(self, lines: list[str]) -> list[SectionItem]:
        """Parse projects section"""
        items = []
        current_project = None
        current_bullets = []
        item_order = 0
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            if line.startswith(('•', '-', '–', '▪', '*')):
                bullet_text = re.sub(r'^[•\-–▪*]\s*', '', line)
                if current_project and bullet_text:
                    current_bullets.append(Bullet(
                        id=str(uuid.uuid4()),
                        text=bullet_text,
                        order=len(current_bullets)
                    ))
            else:
                # New project
                if current_project:
                    current_project.bullets = current_bullets
                    items.append(SectionItem(
                        id=str(uuid.uuid4()),
                        order=item_order,
                        content=current_project
                    ))
                    item_order += 1
                    current_bullets = []
                
                current_project = ProjectItem(
                    name=line,
                    bullets=[]
                )
        
        if current_project:
            current_project.bullets = current_bullets
            items.append(SectionItem(
                id=str(uuid.uuid4()),
                order=item_order,
                content=current_project
            ))
        
        return items

    def _parse_generic_section(self, lines: list[str]) -> list[SectionItem]:
        """Generic section parsing for unrecognized sections"""
        bullets = []
        for i, line in enumerate(lines):
            line = line.strip()
            if line:
                bullets.append(Bullet(
                    id=str(uuid.uuid4()),
                    text=line,
                    order=i
                ))
        
        if bullets:
            from app.models.resume import CustomItem
            return [SectionItem(
                id=str(uuid.uuid4()),
                order=0,
                content=CustomItem(bullets=bullets)
            )]
        
        return []

    def _create_empty_resume(self) -> Resume:
        """Create an empty resume structure for error cases"""
        return Resume(
            id=str(uuid.uuid4()),
            metadata=ResumeMetadata(name="Unknown"),
            sections=[],
            version=1
        )
