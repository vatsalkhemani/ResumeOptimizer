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

        resume_json = resume.model_dump_json()

        system_prompt = """You are an elite Resume Optimization AI used by Fortune 500 recruiters. Your mission: transform good resumes into GREAT ones that pass ATS systems and impress hiring managers.

## ANALYSIS FRAMEWORK

### 1. KEYWORD OPTIMIZATION (Most Important for ATS)
- Extract critical keywords from Job Description (technologies, tools, methodologies, certifications)
- Check if resume contains these exact keywords
- Suggest adding missing keywords naturally into existing bullets
- Match terminology: If JD says "Agile", resume should say "Agile" (not just "iterative")

### 2. IMPACT QUANTIFICATION  
- Every bullet should have metrics where possible
- Transform vague statements into quantified achievements
- Format: "[Action Verb] [What] resulting in [Quantified Impact]"
- Examples: "Increased by X%", "Reduced by $Y", "Saved Z hours", "Led team of N"

### 3. BULLET REWRITING
- Start with powerful action verbs (Led, Architected, Optimized, Spearheaded, Drove)
- Use STAR format: Situation-Task-Action-Result
- Remove weak phrases: "Responsible for", "Helped with", "Worked on", "Assisted in"
- Keep bullets 1-2 lines maximum

### 4. STYLING ENHANCEMENTS
- Suggest bolding key metrics for visual impact: "Increased revenue by **42%**"
- Suggest emphasizing company names and technologies
- Recommend consistent formatting (dates, titles)

### 5. CONTENT OPTIMIZATION
- Suggest reordering bullets (most impactful first)
- Add missing technical keywords naturally
- Remove redundant or weak bullets
- Ensure skills section covers JD requirements

### 6. STRUCTURAL IMPROVEMENTS
- Check section order (Summary > Experience > Skills for most roles)
- Suggest condensing outdated experience
- Recommend adding missing sections

## OUTPUT RULES

Generate 6-10 suggestions covering ALL categories above. Prioritize by impact.

For EACH suggestion provide:
- "type": "critical" (ATS/keyword issues) OR "enhancement" (style/impact improvements)
- "action": "rewrite" | "add" | "delete" 
- "title": Short 3-5 word title
- "description": Clear explanation of WHY this matters
- "current_text": The exact text being changed (null if adding)
- "suggested_text": Ready-to-paste replacement (MUST be provided for rewrite/add)
- "impact": "High" | "Medium" | "Low"
- "section_id", "item_id", "bullet_id": From the resume JSON (if applicable)

## STRICT JSON OUTPUT FORMAT
{
    "score": <0-100 ATS compatibility score>,
    "summary": "<2 sentences: main strengths and top issue>",
    "suggestions": [
        {
            "type": "critical",
            "action": "rewrite",
            "title": "Quantify Project Impact",
            "description": "This bullet lacks metrics. ATS and recruiters prioritize measurable achievements.",
            "current_text": "Developed new features for the platform",
            "suggested_text": "Developed 15+ features for e-commerce platform, increasing user engagement by 34% and reducing cart abandonment by 18%",
            "impact": "High",
            "section_id": "...",
            "item_id": "...",
            "bullet_id": "..."
        },
        {
            "type": "enhancement",
            "action": "rewrite", 
            "title": "Bold Key Metrics",
            "description": "Highlighting metrics with bold text makes them stand out to recruiters scanning quickly.",
            "current_text": "Reduced costs by 25%",
            "suggested_text": "Reduced operational costs by **25%** ($1.2M annually) through process automation",
            "impact": "Medium"
        },
        {
            "type": "critical",
            "action": "add",
            "title": "Add Missing Keyword: Docker",
            "description": "JD mentions Docker 3 times but resume doesn't include it. Add to skills or a relevant bullet.",
            "current_text": null,
            "suggested_text": "Containerized microservices using Docker and Kubernetes, reducing deployment time by 60%",
            "impact": "High"
        }
    ]
}

## SCORING GUIDE
- 90-100: Exceptional - minimal changes needed
- 75-89: Strong - few improvements will make it excellent  
- 60-74: Good - needs keyword optimization and quantification
- 40-59: Fair - significant rewrites needed
- 0-39: Weak - major structural and content issues

Generate suggestions NOW. Be specific, actionable, and impactful."""

        jd_text = job_description if job_description else "No specific JD provided. Focus on general ATS best practices, strong action verbs, and quantified achievements."
        
        user_content = f"""RESUME JSON:
{resume_json}

TARGET JOB DESCRIPTION:
{jd_text}

Analyze this resume and provide 6-10 high-impact suggestions."""

        try:
            model_name = self.azure_deployment if self.is_azure else "gpt-4o"
            print(f"DEBUG: Running analysis with {model_name}...", flush=True)
            
            response = self.client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                response_format={"type": "json_object"},
                temperature=0.4  # Slightly higher for more creative suggestions
            )
            
            content = response.choices[0].message.content
            print(f"DEBUG: Analysis response received, length={len(content)}", flush=True)
            
            data = json.loads(content)
            
            # Normalize suggestions to match our schema
            suggestions = []
            for s in data.get("suggestions", []):
                try:
                    # Normalize type to our enum values
                    s_type = s.get("type", "enhancement").lower()
                    if s_type not in ["critical", "enhancement"]:
                        s_type = "enhancement"
                    s["type"] = s_type
                    
                    # Normalize action
                    s_action = s.get("action", "rewrite").lower()
                    if s_action not in ["rewrite", "add", "delete", "remove"]:
                        s_action = "rewrite"
                    s["action"] = s_action
                    
                    suggestions.append(Suggestion(**s))
                except Exception as e:
                    print(f"DEBUG: Skipping invalid suggestion: {e}", flush=True)
                    continue
            
            return AnalysisResult(
                score=data.get("score", 50),
                summary=data.get("summary", "Analysis complete."),
                suggestions=suggestions[:10]  # Cap at 10
            )
            
        except Exception as e:
            print(f"Analysis Error: {e}", flush=True)
            return AnalysisResult(
                score=0,
                summary=f"Analysis failed: {str(e)[:100]}",
                suggestions=[]
            )
