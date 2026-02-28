import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './lib/db/schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import { getGenAI } from './lib/gemini.js';

dotenv.config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

const SESSION_ID = 'd53834b4-d318-454c-8afe-df435cea82ad'; // the Priyanshu Singh session

const startTime = new Date();
const addSecs = (secs) => new Date(startTime.getTime() + secs * 1000).toISOString();

const fakeTranscript = [
    // 0:00 - Introductions & Experience Clarification (Addressing the "Jan 2026 - Present" Red Flag)
    { role: 'model', text: "Hi Priyanshu Singh, welcome to your interview for the Full-Stack Engineer position. I'm your AI interviewer from InterviewIQ. Let's get started. Looking at your resume, it says your experience runs from 'Jan 2026 - Present'. Can you clarify your actual years of professional experience?", timestamp: addSecs(0) },
    { role: 'user', text: "Oh, that's definitely a typo on the generated PDF, apologies for that! I've been building and deploying full-stack applications for about two years now, mostly focusing on the React ecosystem with Next.js and Node backends. Most of my complex work has been in the last year building systems like InterviewIQ and Enroller.", timestamp: addSecs(20) },
    { role: 'model', text: "Thank you for clarifying. Let's dig into your recent project, InterviewIQ, which you've listed on GitHub. It looks like you've integrated quite a few modern tools—Next.js, Drizzle, Clerk Auth, and Gemini. Can you walk me through the architecture of the live interview bridging layer and why you chose WebSockets instead of a standard REST API for it?", timestamp: addSecs(45) },

    // 01:40 - Deep Dive: InterviewIQ & LLMs (WebSockets vs REST)
    { role: 'user', text: "Sure. For the actual live interview where the user talks to the AI, a REST API is simply too slow and disconnected. If we used REST, the client would have to record audio, send a POST request with the blob, wait for the Server to ping Gemini, wait for Gemini to generate the text, and then wait for text-to-speech. The latency would ruin the conversational feel. By using the Gemini Multimodal Live API over WebSockets, we open a persistent, bi-directional connection directly from the browser to the LLM. Audio chunks stream up constantly, and audio streams back constantly. It reduces the perceived latency to almost nothing.", timestamp: addSecs(105) },
    { role: 'model', text: "That makes perfect sense for the audio streaming piece. However, if the browser is talking directly to Gemini, how are you ensuring security? Specifically, how do you prevent a malicious user from extracting your API keys or abusing your quota?", timestamp: addSecs(145) },
    { role: 'user', text: "That was a major security concern. We absolutely do not ship the Gemini API key to the client. Instead, we built a Next.js API route that acts similarly to a proxy, but specifically, it generates an ephemeral access token. The client hits our authenticated Next.js route—protected by Clerk middleware—and requests a session token. Our server uses the master API key to ask Google for a short-lived token scoped only to that specific interview session. We return that short-lived token to the client, and the client uses it to open the WebSocket. If the token leaks, it expires in minutes anyway.", timestamp: addSecs(200) },
    { role: 'model', text: "That is the correct architectural pattern for secure client-side LLM access. Let me ask you: you're using Drizzle ORM and Neon Postgres for data persistence. How are you handling the transcript data? Are you writing to the database on every single word or sentence the AI says?", timestamp: addSecs(245) },

    // 05:00 - System Design & Best Practices (Scaling & Production Systems)
    { role: 'user', text: "Writing to the database on every chunk of streaming text from Gemini would overwhelm our Neon Postgres instance instantly and unnecessarily throttle connection limits. Instead, we buffer the transcript fragments in the client's local React state and `sessionStorage`. We only write the complete transcript to the database at the very end of the interview session, via a single POST request to the `generate-report` endpoint. We also added a `beforeunload` event listener on the browser to try and catch premature exits.", timestamp: addSecs(300) },
    { role: 'model', text: "Buffering is good, but relying purely on the client holding state until the end, plus a `beforeunload` hook, is risky. What if the browser crashes, the tab runs out of memory, or the user's internet drops abruptly? You lose the entire interview record.", timestamp: addSecs(340) },
    { role: 'user', text: "You're right, that is a vulnerability in our current design. The client-side state is fragile. If the tab hard crashes, `beforeunload` won't run.", timestamp: addSecs(360) },
    { role: 'model', text: "Exactly. How would you redesign that system to guarantee data durability during the interview, without reverting to the problem of overwhelming the database with writes on every single word?", timestamp: addSecs(375) },
    { role: 'user', text: "To guarantee durability without overwhelming Postgres, I would implement a lightweight intermediary layer. Instead of Postgres, the client could periodically send chunks—say, every 5 seconds or every time a 'turn' finishes—to a distributed key-value store like Redis. Redis is in-memory and handles high-throughput appends extremely well. It would act as a highly durable buffer. Once the interview completes, a background worker on our server would pull the full transcript from Redis, persist it permanently into the Postgres database, and then flush the Redis key.", timestamp: addSecs(430) },

    // 08:00 - Digging into REST APIs & Scalability (Addressing the Gaps)
    { role: 'model', text: "Using Redis as a write-through buffer is a solid architectural upgrade for a large-scale system. Let's talk about the rest of your backend. Your resume indicates strong Next.js skills, but I want to understand your approach to designing standard RESTful APIs. Imagine the 'Enroller' app gets huge, and we need to open a public API for universities to automatically sync student data into our system. How would you design the initial set of endpoints and ensure they are secure and performant?", timestamp: addSecs(480) },
    { role: 'user', text: "For a public B2B API, REST design needs to be very strict. I'd start with standard resource-based routing, like `POST /api/v1/students` for ingestion, `GET /api/v1/students/:uid` for retrieval, and similar endpoints for courses or enrollments. Plural nouns for resource collections is key. For security, since they are external systems, Clerk session cookies won't work. We'd need to implement an API Key provisioning system. Each university gets a high-entropy secret key. They pass this via the `Authorization: Bearer` header. ", timestamp: addSecs(550) },
    { role: 'model', text: "How would you validate those API keys on every request without creating a database bottleneck?", timestamp: addSecs(580) },
    { role: 'user', text: "Querying Postgres on every single API hit just to validate the key is a bad idea. I would use API Gateway level caching or an Edge runtime. But within Next.js, we could cache the valid API keys in Redis. Since checking Redis adds maybe 1-2 milliseconds of latency, it's virtually free. Even better, we could use signed JWTs where the university signs their payload with a shared secret, meaning we don't even need to do a database lookup—we just mathematically verify the signature on our end.", timestamp: addSecs(630) },
    { role: 'model', text: "Validating JWT signatures statelessly is very scalable. Let's push this scenario further. A specific university has a bug in their script and it accidentally starts sending you 5,000 `POST /api/v1/students` requests per second. How do you protect the Enroller system from going down?", timestamp: addSecs(670) },
    { role: 'user', text: "That's a classic DDoS or overwhelming surge scenario. We absolutely have to implement rate limiting. To do this efficiently, I would use the Token Bucket or Leaky Bucket algorithm implemented via Redis. Since we already have Redis in the architecture (from the API key caching or transcript buffer ideas), we can use Redis to track the number of requests per API key per minute. If a single university's key exceeds, say, 100 requests per second, the middleware immediately returns an HTTP 429 'Too Many Requests' status code. This blocks the traffic at the perimeter before it ever hits our application logic or Postgres database, keeping the rest of the Enroller app stable for everyone else.", timestamp: addSecs(740) },

    // 13:30 - Data Modeling & Migrations
    { role: 'model', text: "Excellent, rate limiting is mandatory for public APIs. Let's touch quickly on Drizzle and Postgres migrations. If you need to drop a widely-used column in the 'InterviewSessions' table—say, you are completely refactoring how 'preInterviewReport' data works—how do you perform that migration safely in a production environment without causing downtime for active users?", timestamp: addSecs(810) },
    { role: 'user', text: "Dropping a column that the live application code is still querying will cause instant errors. A zero-downtime migration requires multiple deployment phases. First, I wouldn't drop the column. I would create the new column or the new table structure. I'd point the Next.js app to start writing to both the old column AND the new column simultaneously—this is the 'dual-write' phase. While it's dual-writing, I would run a background script to backfill all the historical data from the old column into the new one.", timestamp: addSecs(870) },
    { role: 'model', text: "And once the backfill is complete?", timestamp: addSecs(885) },
    { role: 'user', text: "Phase two: I deploy an update to the Next.js app that switches all reading logic to only use the new column. It stops dual-writing and only writes to the new column. At this point, the old column is completely ignored by the app. Phase three: Days or weeks later, once I'm 100% sure we don't need to roll back, I can safely run a Drizzle migration to actually `DROP` the old column from Postgres, recovering the space.", timestamp: addSecs(930) },

    // 16:30 - Behavioral & Soft Skills
    { role: 'model', text: "That is exactly the correct multi-phase approach for zero-downtime migrations. We're nearing the end of our time. I want to ask a quick behavioral question based on your experience. You've built complex tools rapidly, like InterviewIQ. Tell me about a time you took a technical shortcut to hit a deadline, and it ended up coming back to bite you. How did you handle the fallout?", timestamp: addSecs(990) },
    { role: 'user', text: "Actually, that happened recently on the coding round execution logic for this very project. To get the code execution working quickly for a demo, I initially passed the user's raw stringified code directly into the Piston API's `run` endpoint without any structural sanitization or isolation. I figured it was a sandboxed container anyway, so it was fine. But a week later, I noticed someone could inject arbitrary `console.log` overrides or access `process.env` boundaries before the actual evaluation logic ran, which broke the scoring system entirely and caused internal server errors.", timestamp: addSecs(1050) },
    { role: 'model', text: "How did you fix it once you discovered the vulnerability?", timestamp: addSecs(1065) },
    { role: 'user', text: "I immediately pulled back and researched secure execution patterns. I ended up rewriting the evaluation pipeline to wrap all user-submitted code inside an IIFE (Immediately Invoked Function Expression) to protect the global scope. I also added middleware to strictly `JSON.parse` incoming parameter arrays rather than string interpolating them into the executed script. We also clamped the maximum payload size to 50KB to prevent memory exhaustion attacks. It took an extra day of work I hadn't planned for, but it taught me that relying purely on external sandbox containers isn't an excuse to ignore basic input validation in the application logic.", timestamp: addSecs(1120) },
    { role: 'model', text: "That's a fantastic reflection and a very concrete example of learning the hard way why input validation matters at all layers. Priyanshu, that brings us right to the 20-minute mark. Your performance today has been incredibly strong. You demonstrated deep knowledge of modern frontend frameworks, great instincts for system scalability, and a mature approach to database management. Do you have any quick questions for me?", timestamp: addSecs(1160) },
    { role: 'user', text: "Thank you so much! I really enjoyed the architectural discussions. No questions for now, I'm just looking forward to hearing back.", timestamp: addSecs(1185) },
    { role: 'model', text: "It was a pleasure speaking with you. Our recruiting team will follow up shortly with the next steps. Have a wonderful rest of your day!", timestamp: addSecs(1200) },
];

async function generateReport() {
    console.log("Fetching session info...");
    const session = await db.query.interviewSessions.findFirst({
        where: (s, { eq }) => eq(s.id, SESSION_ID)
    });

    if (!session) {
        console.error("Session not found!");
        process.exit(1);
    }

    console.log("Updating session with customized 20-min transcript...");
    await db.update(schema.interviewSessions)
        .set({ transcript: fakeTranscript })
        .where(eq(schema.interviewSessions.id, SESSION_ID));
    console.log("Transcript updated!");

    console.log("Generating the report directly to exactly match the target schema...");
    const genAI = getGenAI();

    const candidateName = session.preInterviewReport?.candidateSummary?.name || "Priyanshu Singh";
    const fitScore = session.preInterviewReport?.fitAnalysis?.fitScore ?? "98";
    const redFlags = session.preInterviewReport?.fitAnalysis?.redFlags?.join(", ") || "Jan 2026 typo";
    const role = "Full-Stack Engineer";

    const formattedTranscript = fakeTranscript
        .map((entry, index) => {
            const roleLabel = entry.role === "model" ? "INTERVIEWER" : "CANDIDATE";
            const text = entry.text || "";
            return `Turn ${index + 1} | ${roleLabel}: ${text}`;
        })
        .join("\n");


    const prompt = `You are generating a structured post-interview performance report.
Return ONLY JSON that exactly matches this schema:

{
  "overallScore": 0-100,
  "overallGrade": "A|B|C|D|F",
  "executiveSummary": "string",
  "dimensions": {
    "technicalDepth": { "score": 1-10, "assessment": "string" },
    "communicationClarity": { "score": 1-10, "assessment": "string" },
    "problemSolvingApproach": { "score": 1-10, "assessment": "string" },
    "projectOwnership": { "score": 1-10, "assessment": "string" },
    "pressureHandling": { "score": 1-10, "assessment": "string" }
  },
  "strengths": ["string"],
  "areasForImprovement": ["string"],
  "hiringRecommendation": "strong_yes|yes|maybe|no"
}

CANDIDATE: ${candidateName}
TARGET ROLE: ${role}
PRE-INTERVIEW FIT SCORE: ${fitScore}
PRE-INTERVIEW RED FLAGS: ${redFlags}

FULL TRANSCRIPT:
${formattedTranscript}`;

    try {
        const result = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const parsedReport = JSON.parse(result.text);

        console.log("Generated Report:", JSON.stringify(parsedReport, null, 2));

        console.log("Saving new report to DB...");
        await db.update(schema.interviewSessions)
            .set({ postInterviewReport: parsedReport })
            .where(eq(schema.interviewSessions.id, SESSION_ID));

        console.log("Successfully generated and saved report with 20-min transcript!");
    } catch (err) {
        console.error("Failed to generate report:", err);
    }
    process.exit(0);
}

generateReport();
