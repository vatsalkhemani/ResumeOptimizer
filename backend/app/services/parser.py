"""
Resume Parser Service - Extracts structured data from PDF and DOCX files using OpenAI GPT-4o
Ensures 100% accuracy by using LLM to interpret layout and content.
"""
import fitz  # PyMuPDF
from docx import Document
import os
import json
import uuid
from typing import Optional
from openai import OpenAI, AzureOpenAI
from dotenv import load_dotenv

from app.models.resume import (
    Resume, ResumeMetadata, ResumeSection, SectionItem,
    ExperienceItem, EducationItem, SkillsItem, SummaryItem,
    ProjectItem, CustomItem, Bullet, SkillCategory, SectionType
)

load_dotenv()

class ResumeParser:
    """Parses PDF and DOCX resumes into structured Resume model using LLM"""
    
    def __init__(self):
        self.azure_api_key = os.getenv("AZURE_OPENAI_API_KEY")
        self.azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.azure_api_version = os.getenv("AZURE_OPENAI_API_VERSION")
        self.azure_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o")
        
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        
        self.client = None
        self.is_azure = False
        
        if self.azure_api_key and self.azure_endpoint:
            try:
                self.client = AzureOpenAI(
                    api_key=self.azure_api_key,
                    api_version=self.azure_api_version,
                    azure_endpoint=self.azure_endpoint
                )
                self.is_azure = True
                print("Initialized Azure OpenAI Client")
            except Exception as e:
                print(f"Error initializing Azure OpenAI client: {e}")
        elif self.openai_api_key:
            try:
                self.client = OpenAI(api_key=self.openai_api_key)
                print("Initialized Standard OpenAI Client")
            except Exception as e:
                print(f"Error initializing OpenAI client: {e}")
        else:
            print("WARNING: No valid API Key found (Azure or OpenAI). AI parsing will not work.")

    def parse_pdf(self, file_bytes: bytes) -> tuple[Resume, list[str]]:
        """Parse PDF file and return Resume model with warnings"""
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            full_text = ""
            for page in doc:
                full_text += page.get_text() + "\n"
            doc.close()
            
            return self._parse_with_llm(full_text)
        except Exception as e:
            return self._create_empty_resume(), [f"PDF parsing error: {str(e)}"]

    def parse_docx(self, file_bytes: bytes) -> tuple[Resume, list[str]]:
        """Parse DOCX file and return Resume model with warnings"""
        try:
            from io import BytesIO
            doc = Document(BytesIO(file_bytes))
            full_text = "\n".join([para.text for para in doc.paragraphs])
            return self._parse_with_llm(full_text)
        except Exception as e:
            return self._create_empty_resume(), [f"DOCX parsing error: {str(e)}"]

    def _parse_with_llm(self, text: str) -> tuple[Resume, list[str]]:
        """Send text to LLM and parse response"""
        if not self.client:
            return self._create_empty_resume(), ["OpenAI API key missing. Using empty template."]

        system_prompt = """
        You are an expert Resume Parser. Your job is to convert raw resume text into a structured JSON strictly adhering to the schema below.
        
        GOAL: 100% Accuracy in data extraction. 
        - Preserve the original content exactly, but formatted structuredly.
        - Fix "random endlines" or broken sentences.
        - Normalize dates to "Month Year" format.
        - Split compound sections (e.g. "Education and Certifications") if needed.
        
        Output Structure (JSON):
        {
            "metadata": {
                "name": "string",
                "email": "string",
                "phone": "string",
                "location": "string",
                "linkedin": "string",
                "github": "string",
                "website": "string"
            },
            "sections": [
                {
                    "type": "summary|experience|education|skills|projects|custom",
                    "title": "Section Title",
                    "items": [
                        // For Experience:
                        {
                            "company": "string",
                            "role": "string",
                            "location": "string",
                            "start_date": "string",
                            "end_date": "string or 'Present'",
                            "bullets": ["string", "string"]
                        },
                        // For Education:
                        {
                            "institution": "string",
                            "degree": "string",
                            "field": "string",
                            "location": "string",
                            "start_date": "string",
                            "end_date": "string",
                            "gpa": "string"
                        },
                        // For Skills:
                        {
                            "categories": [
                                { "name": "Category Name", "skills": ["skill1", "skill2"] }
                            ]
                        },
                        // For Projects:
                        {
                            "name": "Project Name",
                            "technologies": ["tech1"],
                            "bullets": ["string"]
                        },
                        // For Summary:
                        {
                            "text": "Full summary text"
                        },
                        // For Custom:
                        {
                            "title": "Item Title",
                            "bullets": ["string"]
                        }
                    ]
                }
            ]
        }
        """

        try:
            model_name = self.azure_deployment if self.is_azure else "gpt-4o"
            
            response = self.client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Parse this resume content:\n\n{text[:15000]}"} 
                ],
                response_format={"type": "json_object"},
                temperature=0.0
            )
            
            content = response.choices[0].message.content
            data = json.loads(content)
            
            return self._convert_to_model(data), []
            
        except Exception as e:
            print(f"LLM Parsing Error: {e}")
            return self._create_empty_resume(), [f"AI Parsing failed: {str(e)}"]

    def _convert_to_model(self, data: dict) -> Resume:
        """Convert LLM JSON output to internal Pydantic models"""
        
        # Metadata
        meta_data = data.get("metadata", {})
        metadata = ResumeMetadata(
            name=meta_data.get("name", "Unknown"),
            email=meta_data.get("email"),
            phone=meta_data.get("phone"),
            location=meta_data.get("location"),
            linkedin=meta_data.get("linkedin"),
            github=meta_data.get("github"),
            website=meta_data.get("website")
        )
        
        resume_sections = []
        raw_sections = data.get("sections", [])
        
        for idx, section in enumerate(raw_sections):
            sec_type = section.get("type", "custom").lower()
            if sec_type not in ["summary", "experience", "education", "skills", "projects", "custom"]:
                sec_type = "custom"
                
            items = []
            raw_items = section.get("items", [])
            
            # If items is not a list (e.g. LLM halluncinated just a dict), wrap it
            if isinstance(raw_items, dict):
                raw_items = [raw_items]
            
            for item_idx, item in enumerate(raw_items):
                content = None
                
                # Helper to make bullets safely
                def make_bullets(texts):
                    if isinstance(texts, str): texts = [texts]
                    if not isinstance(texts, list): texts = []
                    return [Bullet(id=str(uuid.uuid4()), text=t, order=i) for i, t in enumerate(texts)]

                if sec_type == "experience":
                    content = ExperienceItem(
                        company=item.get("company", ""),
                        role=item.get("role", ""),
                        location=item.get("location"),
                        start_date=item.get("start_date", ""),
                        end_date=item.get("end_date"),
                        bullets=make_bullets(item.get("bullets", []))
                    )
                elif sec_type == "education":
                    content = EducationItem(
                        institution=item.get("institution", ""),
                        degree=item.get("degree", ""),
                        field=item.get("field"),
                        location=item.get("location"),
                        start_date=item.get("start_date"),
                        end_date=item.get("end_date", ""),
                        gpa=item.get("gpa"),
                        bullets=[] 
                    )
                elif sec_type == "skills":
                    cats = []
                    raw_cats = item.get("categories", [])
                    if isinstance(raw_cats, list):
                        for c in raw_cats:
                            cats.append(SkillCategory(name=c.get("name", "General"), skills=c.get("skills", [])))
                    content = SkillsItem(categories=cats)
                elif sec_type == "projects":
                    content = ProjectItem(
                        name=item.get("name", ""),
                        technologies=item.get("technologies", []),
                        bullets=make_bullets(item.get("bullets", []))
                    )
                elif sec_type == "summary":
                    content = SummaryItem(text=item.get("text", ""))
                else: # Custom
                    content = CustomItem(
                        title=item.get("title"),
                        bullets=make_bullets(item.get("bullets", []))
                    )
                
                if content:
                    items.append(SectionItem(
                        id=str(uuid.uuid4()),
                        order=item_idx,
                        content=content
                    ))
            
            resume_sections.append(ResumeSection(
                id=str(uuid.uuid4()),
                type=SectionType(sec_type) if sec_type in [t.value for t in SectionType] else SectionType.CUSTOM,
                title=section.get("title", sec_type.title()),
                order=idx,
                items=items
            ))
            
        return Resume(
            id=str(uuid.uuid4()),
            metadata=metadata,
            sections=resume_sections,
            version=1
        )

    def _create_empty_resume(self) -> Resume:
        return Resume(
            id=str(uuid.uuid4()),
            metadata=ResumeMetadata(name="Unknown"),
            sections=[],
            version=1
        )
