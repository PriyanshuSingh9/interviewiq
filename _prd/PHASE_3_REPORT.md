# Phase 3: Post-Interview Report Generation

*(See `SCHEMAS.md` for exact report structure)*

### 3.1 Trigger

Report generation starts immediately when `interview_complete` event is fired. It runs as a background task in Next.js — the user is already navigating to `/report/[sessionId]` and polling `api/generate-report`.

### 3.2 Next.js Background Worker (`nextapp/app/api/generate-report/route.js`)

```js
// Called by the bridge server via HTTP POST when interview ends
// Or called by the report page on first load if report doesn't exist yet
export async function POST(request) {
  const { sessionId } = await request.json()

  // Non-blocking — fire and forget, poll separately
  generateReportBackground(sessionId)

  return NextResponse.json({ status: 'generating' })
}

async function generateReportBackground(sessionId) {
  const transcript = await redis.get(`transcript:${sessionId}`)
  const context = await redis.get(`context:${sessionId}`)
  if (!transcript || !context) return

  const report = await generateReport(
    JSON.parse(transcript),
    JSON.parse(context)
  )

  await redis.set(`report:${sessionId}`, JSON.stringify(report), 'EX', 604800)
  // TODO (post-hackathon): also write to PostgreSQL for persistence
}
```

### 3.3 Ollama Report Generator (`nextapp/lib/reportGenerator.js`)

```js
export async function generateReport(transcript, context) {
  const formattedTranscript = transcript.map(entry => {
    const mins = Math.floor(entry.timestamp / 60000)
    const secs = Math.floor((entry.timestamp % 60000) / 1000)
    return `[${mins}:${secs.toString().padStart(2, '0')}] ${entry.role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'}: ${entry.text}`
  }).join('\n')

  const prompt = `
You are generating a detailed post-interview performance report.
Analyze the transcript and produce a structured JSON report.

CANDIDATE: ${context.candidateName}
ROLE: ${context.targetRoleFocus}
EXPECTED TOPICS: ${context.interviewPlan.priorityTopicsGlobal.join(', ')}
RED FLAGS THAT WERE FLAGGED: ${context.interviewPlan.redFlagsToProbe.join(', ')}

FULL TRANSCRIPT:
${formattedTranscript}

Return ONLY JSON exactly matching the report schema. No explanation. No markdown.
`

  const response = await ollama.chat({
    model: 'qwen2.5-coder',
    messages: [{ role: 'user', content: prompt }],
    format: 'json',
    options: { temperature: 0.2, num_predict: 2048 }
  })

  return JSON.parse(response.message.content)
}
```

### 3.4 Report Timeout & Error Handling

- Report generation timeout: 120 seconds (Ollama can be slow on large transcripts)
- If timeout: save `{ error: 'Report generation timed out', partialTranscript: [...] }` to Redis
- Frontend: if report contains `error` field → show error state with option to regenerate
- Frontend poll: stop after 10 failed attempts (20 seconds) → show "Taking longer than expected" with manual refresh button
