# ResumeOptimizer 🚀

**ResumeOptimizer** is a tool designed to help students and professionals increase their chances of getting hired. By optimizing resumes and improving keyword matching, this project aims to help candidates successfully pass through **Applicant Tracking Systems (ATS)**.

## Key Features

- **Resume Optimization**: Tailor your resume to highlight your strengths
- **ATS Keyword Matching**: Identify and include crucial keywords from job descriptions
- **AI-Powered Suggestions**: Get intelligent recommendations to improve your resume
- **Professional PDF Export**: Clean, ATS-friendly LaTeX-rendered output
- **Live Preview**: See changes in real-time as you accept suggestions

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- A LaTeX distribution (TeX Live or MiKTeX)
- OpenAI API key

### Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and add your API keys:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   # Frontend
   cd frontend && npm install
   
   # Backend
   cd backend && pip install -r requirements.txt
   ```
4. Start the development servers:
   ```bash
   # Terminal 1 - Backend
   cd backend && uvicorn app.main:app --reload
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

## Documentation

- [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md) - System design and architecture

## Security

⚠️ **Never commit your `.env` file!** The `.gitignore` is configured to exclude it automatically.

---
*Helping you land your dream job, one keyword at a time.*
