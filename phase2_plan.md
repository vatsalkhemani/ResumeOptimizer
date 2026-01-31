# Phase 2: Job Description Analysis & Keyword Matching

## Objective
Enable users to optimize their resume for a specific job description (JD) by analyzing keyword gaps and providing a match score.

## Features

### 1. Job Description Management
- **UI**: Add "Target Job" button to the editor header or sidebar.
- **Input**: Modal or expandable area to paste JD text (Title + Description).
- **State**: Store JD text in `useDocumentStore`.

### 2. Keyword Extraction & Matching (Backend)
- **Model Update**: Update `AnalysisResult` to include:
  - `keywords`: List of extracted keywords from JD.
  - `matches`: Which keywords are found in the resume.
  - `missing`: Which critical keywords are missing.
- **Service Update**: Update `AnalysisService.analyze_resume` (or create new `analyze_match`) to:
  1. Extract keywords from JD (Skills, Tools, Certs).
  2. Search for them in the Resume text.
  3. Return the comparison.

### 3. Keyword Gap Visualization (Frontend)
- **UI**: New "Keyword Match" panel in the sidebar (or toggle with Suggestions).
- **Match Score**: Display specific "JD Match Score" (separate from general ATS score).
- **Keyword List**:
  - ✅ Matched keywords (Green)
  - ❌ Missing keywords (Red/Gray) with "Add" button?
- **Action**: Clicking "Add" on a missing keyword could trigger "Ask AI" to suggest where to add it (or just copy it).

## Implementation Steps

1.  **Backend Models**: definitions for `Keyword`, `JobAnalysis`.
2.  **Backend Logic**: Enhance `analyze_resume` to output keyword data.
3.  **Frontend Store**: Update `types.ts` and `store.ts` to hold JD and keyword data.
4.  **Frontend UI**:
    - Add "Target Job" input.
    - Create `KeywordPanel` component.
    - Integrate into Sidebar.
