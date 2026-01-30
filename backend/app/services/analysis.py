"""
Analysis Service - Generates AI suggestions for resume improvement.
"""
import os
import json
from typing import Optional
from openai import OpenAI, AzureOpenAI

from app.models.resume import Resume
from app.models.analysis import AnalysisResult, Suggestion, SuggestionType, SuggestionAction



class AnalysisService:
    """Analyzes resume against job description using LLM"""
    
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
            except Exception as e:
                print(f"Error initializing Azure OpenAI client: {e}")
        elif self.openai_api_key:
            try:
                self.client = OpenAI(api_key=self.openai_api_key)
            except Exception as e:
                print(f"Error initializing OpenAI client: {e}")

    def analyze_resume(self, resume: Resume, job_description: str) -> AnalysisResult:
        """Generate suggestions based on resume and JD"""
        if not self.client:
            raise Exception("AI Client not initialized")

        # Convert resume to JSON string for prompt
        resume_json = resume.model_dump_json()

        system_prompt = """
        You are an elite Resume Coach. Your goal is to maximize the candidate's ATS score and relevance for the target job.
        
        Analyze the Resume JSON against the Job Description.
        Identify 3-5 high-impact improvements.
        
        Categorize suggestions into:
        - CRITICAL: Missing major keywords, bad formatting, or weak impact statistics.
        - STYLISTIC: Passive voice, weak verbs, repetition.
        - FORMATTING: Inconsistent dates, hard-to-read sections.
        - CONTENT: Irrelevant info.

        Output strict JSON structure matching AnalysisResult schema.
        
        Rules:
        1. Be specific. "Add keyword 'Kubernetes'" is better than "Add more skills".
        2. Provide 'suggested_text' that the user can directly swap in.
        3. 'section_id', 'item_id', and 'bullet_id' must match the resume structure IDs EXACTLY.
        4. Calculate a realistic ATS score (0-100).
        
        Output Example:
        {
            "score": 75,
            "summary": "Strong experience but lacks keywords matches for 'Cloud Native'.",
            "suggestions": [
                {
                    "type": "critical",
                    "action": "rewrite",
                    "title": "Quantify Impact",
                    "description": "Change 'Managed team' to 'Managed team of 5 engineers...'",
                    "current_text": "Managed team",
                    "suggested_text": "Managed team of 5 engineers delivering...",
                    "impact": "High",
                    "section_id": "uuid...",
                    "item_id": "uuid...",
                    "bullet_id": "uuid..."
                }
            ]
        }
        """

        user_content = f"RESUME JSON:\n{resume_json}\n\nTARGET JOB DESCRIPTION:\n{job_description}"

        try:
            model_name = self.azure_deployment if self.is_azure else "gpt-4o"
            
            response = self.client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            
            content = response.choices[0].message.content
            data = json.loads(content)
            
            # Map JSON to Pydantic models manually or let Pydantic do it if structure matches
            return AnalysisResult(**data)
            
        except Exception as e:
            print(f"Analysis Error: {e}")
            # Return a fallback empty result so UI doesn't crash
            return AnalysisResult(
                score=0,
                summary="Failed to analyze resume. Please check API configuration.",
                suggestions=[]
            )
