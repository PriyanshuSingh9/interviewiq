# Phase 3: Post-Interview Report Generation

*(See `SCHEMAS.md` for exact report structure)*

### 3.1 Trigger

Report generation starts when the user navigates to `/report/[sessionId]`. The page retrieves the session ID and transcript (with fallback to the database) and makes a `POST` request to `/api/generate-report`.

### 3.2 Report Generator API (`app/api/generate-report/route.js`)

```js
// Called by the report page on load
export async function POST(request) {
  const { sessionId, transcript } = await request.json();

  // Load context from DB and generate report
  // ...
  
  // Persist both report and transcript to DB
  await db
    .update(interviewSessions)
    .set({ postInterviewReport: report, transcript })
    .where(eq(interviewSessions.id, sessionId));

  return Response.json({ status: 'completed', report });
}
```



```js
export async function generatePostInterviewReport({ transcript, preInterviewReport, targetRole }) {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: postInterviewReportSchema,
    },
  });

  const prompt = `...`; // contextualized prompt with transcript and preInterviewReport
  const response = await model.generateContent(prompt);
  return JSON.parse(response.text());
}
```

### 3.4 Report Error Handling

- If Gemini fails or times out: API returns `502 Bad Gateway` and saves the transcript anyway for recovery.
- Frontend: if report API fails → show error state with option to retry generation manually.
- The transcript is persisted in PostgreSQL to ensure it isn't lost if the browser tab is closed.
