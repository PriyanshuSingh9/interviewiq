# Phase 1: Data Ingestion & Context Building

*(See `SCHEMAS.md` for exact data structures)*

### 1.1 Frontend — `/upload` Page

Form fields:
- Resume PDF (file upload, max 5MB, PDF only)
- Job Description (textarea, plain text)
- GitHub Profile URL (text input, validated as `github.com/{username}`)

On submit: POST to `/api/prepare` as `multipart/form-data`. Show progress indicator with step labels ("Parsing resume...", "Analyzing GitHub...", "Building interview plan..."). Redirect to `/interview/[sessionId]` on success.

Error states to handle:
- PDF parse failure → "Could not read your resume. Try a text-based PDF."
- GitHub rate limit → "GitHub API limit reached. Add a GITHUB_TOKEN to your .env."
- Ollama timeout (>60s) → "Analysis is taking longer than expected. Retrying..."
- Generic 500 → "Something went wrong. Please try again."

### 1.2 Resume Parsing (`nextapp/lib/resumeParser.js`)

```js
import pdfParse from 'pdf-parse'

export async function parseResume(fileBuffer) {
  const data = await pdfParse(fileBuffer)
  // Truncate to 4000 chars — beyond this adds noise, not signal
  return data.text.slice(0, 4000)
}
```

**Failure handling:** If `pdfParse` throws, return `null` and surface error to user. Do not proceed to Ollama with empty resume.

### 1.3 GitHub Architectural Skeleton Parsing (`nextapp/lib/githubAnalyzer.js`)

**Goal:** Extract enough structural information about a repo to ask intelligent architectural questions — without fetching full source code (too many tokens, too slow).

**What to fetch per repo (in this exact order, stop if rate-limited):**
1. Repo metadata (name, description, language, stars, topics)
2. `README.md` — first 1500 chars only
3. Root file tree (non-recursive, top-level only) — file names only, no content
4. Dependency file content — pick the FIRST match from this priority list:
   - `package.json` (Node)
   - `requirements.txt` or `pyproject.toml` (Python)
   - `go.mod` (Go)
   - `Cargo.toml` (Rust)
   - `pom.xml` (Java/Maven)
   - `build.gradle` (Java/Gradle)
   - None found → skip, note "no dependency file found"
5. Root-level config files that reveal architecture (pick up to 3):
   - `docker-compose.yml`, `Dockerfile`, `.github/workflows/*.yml`, `nginx.conf`

**Repo selection:** Extract GitHub repository URLs directly mentioned in the parsed Resume text. Fetch only those specific repositories (up to a limit of 3) to ensure questions focus on projects the candidate explicitly claims.

**Edge cases:**
- Invalid/dead URL in resume → skip silently, note in profile
- Private repos → skip silently, note in profile
- Empty repos (no README, no files) → skip, note in profile
- Rate limit (403/429) → return whatever was fetched so far, add note "GitHub rate limited — partial data"

```js
export class GitHubAnalyzer {
  constructor(githubUrl) {
    this.username = githubUrl.replace(/\/$/, '').split('/').pop()
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
  }

  async getArchitecturalSkeletons(limit = 3) {
    const repos = await this._selectTopRepos(limit)
    return Promise.allSettled(repos.map(r => this._buildSkeleton(r)))
      .then(results => results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
      )
  }

  async _selectTopRepos(limit) {
    const { data } = await this.octokit.repos.listForUser({
      username: this.username, per_page: 30, sort: 'pushed'
    })
    return data
      .filter(r => !r.fork || r.stargazers_count > 0) // skip unmodified forks
      .sort((a, b) => {
        const scoreA = a.stargazers_count * 2 + (this._isRecent(a) ? 10 : 0)
        const scoreB = b.stargazers_count * 2 + (this._isRecent(b) ? 10 : 0)
        return scoreB - scoreA
      })
      .slice(0, limit)
  }

  _isRecent(repo) {
    const daysSincePush = (Date.now() - new Date(repo.pushed_at)) / 86400000
    return daysSincePush < 180
  }

  async _buildSkeleton(repo) {
    const [readme, depFile, fileTree] = await Promise.allSettled([
      this._getReadme(repo.name),
      this._getDependencyFile(repo.name),
      this._getRootFileTree(repo.name)
    ])

    return {
      repoName: repo.name,
      description: repo.description || '',
      primaryLanguage: repo.language || 'unknown',
      topics: repo.topics || [],
      stars: repo.stargazers_count,
      isFork: repo.fork,
      readmeExcerpt: readme.status === 'fulfilled' ? readme.value.slice(0, 1500) : null,
      dependencyFile: depFile.status === 'fulfilled' ? depFile.value : null,
      rootFileTree: fileTree.status === 'fulfilled' ? fileTree.value : [],
      skeletonNote: []  // filled with edge case notes
    }
  }

  async _getRootFileTree(repoName) {
    const { data } = await this.octokit.repos.getContent({
      owner: this.username, repo: repoName, path: ''
    })
    // Return file/dir names only — no content, no SHA
    return data.map(item => `${item.type === 'dir' ? '📁' : '📄'} ${item.name}`)
  }

  async _getDependencyFile(repoName) {
    const candidates = [
      'package.json', 'requirements.txt', 'pyproject.toml',
      'go.mod', 'Cargo.toml', 'pom.xml', 'build.gradle'
    ]
    for (const filename of candidates) {
      try {
        const { data } = await this.octokit.repos.getContent({
          owner: this.username, repo: repoName, path: filename
        })
        const content = Buffer.from(data.content, 'base64').toString('utf-8')
        return { filename, content: content.slice(0, 800) } // hard cap at 800 chars
      } catch { continue }
    }
    return null
  }

  async _getReadme(repoName) {
    const { data } = await this.octokit.repos.getReadme({
      owner: this.username, repo: repoName
    })
    return Buffer.from(data.content, 'base64').toString('utf-8')
  }
}
```

### 1.4 Ollama Context Builder (`nextapp/lib/contextBuilder.js`)

**Model:** `qwen2.5-coder` — better at structured code analysis than llama3.1

**What the LLM must output** (forced JSON via `format: 'json'`): Ensure it strictly matches the Candidate Profile Schema in `SCHEMAS.md`.

```js
const CONTEXT_BUILDER_PROMPT = `
You are an expert technical recruiter and senior engineer.
Analyze the candidate's resume, GitHub architectural skeletons, and job description.
Produce a structured interview context document.

RESUME:
{{RESUME}}

JOB DESCRIPTION:
{{JD}}

GITHUB ARCHITECTURAL SKELETONS:
{{SKELETONS}}

Return ONLY a JSON object exactly matching the required schema. No explanation. No markdown. Raw JSON only.
`
```

**Timeout:** Set Ollama call timeout to 90 seconds. If exceeded, return 503 to client with retry-able error.

**Validation:** After Ollama returns, validate with Zod schema before saving to Redis (`context:{sessionId}`). If validation fails, retry once with a stricter prompt. If it fails twice, surface error to user.

### 1.5 System Prompt Pre-building (`nextapp/lib/systemPromptBuilder.js`)

**Key insight:** Build one system prompt string per round during Phase 1, not at interview time. The bridge server just loads the right string from Redis when transitioning rounds — no LLM call needed at transition time.

```js
export function buildRoundPrompts(profile) {
  const basePersona = `
You are Alex, a senior software engineer conducting a technical interview at a top tech company.
You are professional, direct, and intellectually rigorous.
You are interviewing ${profile.candidateName}, a ${profile.candidateLevel}-level candidate for a ${profile.targetRoleFocus} role.

CANDIDATE CONTEXT:
- Strong skills: ${profile.skillAssessment.strong.join(', ')}
- Known gaps: ${profile.skillAssessment.gapsVsJD.join(', ')}
- Fit score: ${profile.fitScore}/100
- Key gaps to probe: ${profile.interviewPlan.redFlagsToProbe.join('; ')}

THEIR PROJECTS (reference these directly — never ask generic questions):
${profile.architecturalSkeletons.map(s => `
Repo: ${s.repoName}
Purpose: ${s.inferredPurpose}
Stack: ${s.inferredStack.join(', ')}
Observations: ${s.architecturalObservations.join('; ')}
Prepared questions: 
${s.aggressiveQuestions.map((q, i) => `  ${i + 1}. ${q}`).join('\n')}
`).join('\n---\n')}

VOICE AND BEHAVIOR RULES:
- You are speaking, not writing. Keep questions to 1-3 spoken sentences max.
- Never ask two questions in one turn.
- If the answer is strong, briefly acknowledge and escalate: "Good — now what happens if..."
- If the answer is weak or vague, probe: "Be specific. What exactly did you do there?"
- If the candidate rambles past their point, cut in: "Hold on — give me the one-sentence answer first."
- Never give the answer. Never hint. Never be sympathetic about difficulty.
- Do not break character. Do not acknowledge you are an AI.
`

  const rounds = {}

  profile.interviewPlan.rounds.forEach(round => {
    rounds[round.id] = basePersona + `

CURRENT ROUND: ${round.name}
FOCUS: ${round.focus}
YOUR OPENING LINE (say this verbatim): "${round.openingLine}"
KEY TOPICS TO HIT THIS ROUND: ${round.keyTopicsToHit.join(', ')}
TURNS ALLOCATED: ${round.turnCount}
${round.transitionLine ? `TRANSITION LINE (say verbatim when moving on): "${round.transitionLine}"` : 'THIS IS THE FINAL ROUND. End with: "That\'s everything from me. Thanks for your time."'}

HARD RULES FOR THIS ROUND:
- Stay on the topics above. Do not wander into other areas.
- When you have covered the key topics and used your allocated turns, say your transition line.
- Do not repeat a question you have already asked this session.
`
  })

  return rounds  // { resume_deep_dive: "...", system_design: "...", behavioral: "...", closing: "..." }
}
```

**Redis storage:**
Saved to `systemprompts:{sessionId}` as serialized JSON.
