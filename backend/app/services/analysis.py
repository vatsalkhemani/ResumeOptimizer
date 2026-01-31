"""
Analysis Service - Generates AI suggestions for resume improvement.
"""
import os
import json
from typing import Optional
from openai import OpenAI, AzureOpenAI

from app.models.resume import Resume
from app.models.analysis import AnalysisResult, Suggestion, SuggestionType, SuggestionAction, KeywordMatch, KeywordCategory



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

### 4. STYLING/FORMATTING ENHANCEMENTS (Generate 2-3 of these)
- Bold all numbers and percentages: "Increased revenue by **42%**"
- CRITICAL: The suggested_text MUST be the EXACT same length or longer than current_text
- NEVER remove words, NEVER shorten sentences, NEVER cut text
- IF YOU SHORTEN THE TEXT, THE USER WILL REJECT IT.
- Only ADD formatting markers like ** around numbers
- Example: "Reduced costs by 25%" becomes "Reduced costs by **25%**" (same words, just added **)

### 5. SKILLS SECTION
- For skills, suggest adding individual KEYWORDS (e.g., "Python", "Docker", "AWS")
- Do NOT suggest full sentences for skills - just the skill name
- Skills suggestions should have short suggested_text (1-3 words max)

### 6. CONTENT OPTIMIZATION
- Suggest reordering bullets (most impactful first)
- Add missing technical keywords naturally
- Remove redundant or weak bullets

### 6. STRUCTURAL IMPROVEMENTS
- Check section order (Summary > Experience > Skills for most roles)
- Suggest condensing outdated experience
- Recommend adding missing sections

## OUTPUT RULES

Generate 6-10 suggestions with this distribution:
- 2-3 FORMATTING suggestions (category: "formatting", action: "format") - Bold metrics, emphasize keywords
- 4-6 CONTENT suggestions (category: "content") - Rewrites, additions, deletions
- 1-2 STRUCTURAL suggestions if needed

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
    "score": <0-100 General ATS score>,
    "match_score": <0-100 Score based specifically on JD keyword coverage>,
    "summary": "<2 sentences: main strengths and top issue>",
    "keywords": [
        {
            "term": "Python",
            "category": "skill",
            "found": true,
            "importance": "High"
        }
    ],
    "suggestions": [
        {
            "type": "critical",
            "action": "rewrite",
            "category": "content",
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
            "action": "format",
            "category": "formatting",
            "title": "Bold Key Metrics",
            "description": "Highlighting metrics with bold text makes them stand out to recruiters scanning quickly.",
            "current_text": "Reduced costs by 25%",
            "suggested_text": "Reduced operational costs by **25%** ($1.2M annually) through process automation",
            "impact": "Medium"
        },
        {
            "type": "enhancement",
            "action": "format",
            "category": "formatting",
            "title": "Emphasize Key Technologies",
            "description": "Bold or italicize important technologies to catch recruiter attention.",
            "current_text": "Built APIs using Python and FastAPI",
            "suggested_text": "Built RESTful APIs using **Python** and **FastAPI**, handling 10K+ daily requests",
            "impact": "Medium"
        },
        {
            "type": "critical",
            "action": "add",
            "category": "content",
            "title": "Add Missing Keyword: Docker",
            "description": "JD mentions Docker 3 times but resume doesn't include it. Add to skills or a relevant bullet.",
            "current_text": null,
            "suggested_text": "Containerized microservices using Docker and Kubernetes, reducing deployment time by 60%",
            "impact": "High"
        }
    ]
}

## CATEGORIES
- "content": Suggestions that add, remove, or rewrite text (new bullets, rewording, adding metrics)
- "formatting": Suggestions that change visual styling (bold, italics, structure improvements)

## SCORING GUIDE
- Match Score: Calculates how many critical JD keywords are present in the resume.
- General Score: Combination of keyword match, formatting, quantification, and impact.
- 90-100: Exceptional
- 70-89: Strong
- <70: Needs Improvement

Generate suggestions NOW. Be specific, actionable, and impactful. Include 10-15 top keywords from the JD."""

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
                    
                    # Normalize action (now includes format)
                    s_action = s.get("action", "rewrite").lower()
                    if s_action not in ["rewrite", "add", "delete", "remove", "format"]:
                        s_action = "rewrite"
                    s["action"] = s_action
                    
                    # Normalize category
                    s_category = s.get("category", "content").lower()
                    if s_category not in ["content", "formatting"]:
                        # Infer category from action
                        s_category = "formatting" if s_action == "format" else "content"
                    s["category"] = s_category
                    
                    suggestions.append(Suggestion(**s))
                except Exception as e:
                    print(f"DEBUG: Skipping invalid suggestion: {e}", flush=True)
                    continue
            
            # Process Keywords
            keywords = []
            for k in data.get("keywords", []):
                try:
                    # Normalize category to map to our enum
                    k_cat = k.get("category", "other").lower()
                    # Allow fuzzy matching or default to OTHER
                    try:
                        KeywordCategory(k_cat) # Check if valid enum
                    except ValueError:
                        k_cat = "other"
                    k["category"] = k_cat
                    keywords.append(KeywordMatch(**k))
                except Exception as e:
                    print(f"DEBUG: Skipping invalid keyword: {e}", flush=True)
                    continue

            return AnalysisResult(
                score=data.get("score", 50),
                match_score=data.get("match_score"),
                summary=data.get("summary", "Analysis complete."),
                suggestions=suggestions[:10],  # Cap at 10
                keywords=keywords
            )
            
        except Exception as e:
            print(f"Analysis Error: {e}", flush=True)
            return AnalysisResult(
                score=0,
                summary=f"Analysis failed: {str(e)[:100]}",
                suggestions=[]
            )

    def custom_edit(
        self,
        current_text: str,
        user_prompt: str,
        context: dict = None
    ) -> dict:
        """
        Process a custom edit request from the user.
        
        Args:
            current_text: The current text of the bullet/item being edited
            user_prompt: The user's freeform instruction (e.g., "add metrics", "make more concise")
            context: Optional context like section_type, job_description, etc.
        
        Returns:
            dict with 'suggested_text' and 'explanation'
        """
        if not self.client:
            raise Exception("AI Client not initialized")
        
        context = context or {}
        job_description = context.get("job_description", "")
        section_type = context.get("section_type", "experience")
        
        system_prompt = """You are an expert resume editor. The user will provide:
1. Current text from their resume (may be empty if adding new content)
2. An editing instruction

Your job is to follow their instruction precisely and return improved/new text.

## RULES:
- Follow the user's instruction exactly
- Maintain professional resume tone
- Keep the result concise (1-2 sentences for bullets)
- If adding metrics, make them realistic and impactful
- Preserve the core meaning unless asked to change it
- Use strong action verbs
- Be specific, not generic
- If no current text is provided, CREATE new content based on the instruction
- If the user asks to REMOVE/DELETE, set "action" to "delete" and "suggested_text" to ""

## OUTPUT FORMAT (JSON):
{
    "suggested_text": "The improved or new text (empty string if delete)",
    "explanation": "Brief explanation of changes made or content created",
    "action": "rewrite" | "add" | "delete"
}
"""

        if current_text:
            user_message = f"""## CURRENT TEXT TO EDIT:
{current_text}

## USER INSTRUCTION:
{user_prompt}

## CONTEXT:
- Section: {section_type}
{"- Job Description: " + job_description[:500] if job_description else ""}

Please edit the text according to the instruction and return JSON."""
        else:
            user_message = f"""## USER INSTRUCTION:
{user_prompt}

## CONTEXT:
- Section: {section_type}
{"- Job Description: " + job_description[:500] if job_description else ""}

The user wants to CREATE new content for their resume. Generate appropriate text based on the instruction and return JSON."""

        try:
            model = self.azure_deployment if self.is_azure else "gpt-4o"
            
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=500
            )
            
            content = response.choices[0].message.content
            data = json.loads(content)
            
            return {
                "suggested_text": data.get("suggested_text", current_text),
                "explanation": data.get("explanation", "Edit applied.")
            }
            
        except Exception as e:
            print(f"Custom Edit Error: {e}", flush=True)
            return {
                "suggested_text": current_text,
                "explanation": f"Error: {str(e)[:100]}"
            }
