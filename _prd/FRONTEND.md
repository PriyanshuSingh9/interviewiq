# Frontend — Key Pages & Components

### 1. `/interview/[sessionId]` Page — Voice Interview Room

**Layout:** Three-panel split
- Left (30%): Live transcript panel — scrolls in real time as both sides speak
- Center (40%): Voice orb + status indicator + round progress bar
- Right (30%): Topic coverage tracker — pills that fill green/yellow/red as topics are hit

**Status states shown in UI:**
- `connecting` — "Connecting to interview server..."
- `ready` — "Alex is ready. Start speaking."
- `candidate_speaking` — Green waveform animation
- `thinking` — Pulsing yellow orb — "Alex is thinking..."
- `interviewer_speaking` — Blue waveform + streaming transcript text
- `interrupted` — Brief flash of red border + interrupt type shown
- `round_transition` — Full-width banner: "Moving to System Design Round →"
- `ended` — "Interview complete. Generating your report..."

**Web Audio Pipeline Notes:** Must handle real-time PCM16 encoding for the `ws` connection to the bridge.

**HTTPS requirement note:** Display a warning if `location.protocol !== 'https:' && location.hostname !== 'localhost'` — microphone access will fail.

### 2. `/report/[sessionId]` Page

**Sections (in order):**
1. Score card — overall score, grade, hiring recommendation badge
2. Executive summary paragraph
3. Dimension radar chart — 5 dimensions, spider chart
4. Annotated timeline — vertical timeline with timestamp markers, clicking a marker plays/shows that exchange
5. Topic breakdown table — topic, performance badge, timestamp link, notes
6. Interruption analysis section — how many times interrupted, recovery quality
7. Red flag findings — table of flagged concerns, whether confirmed or cleared
8. Strengths & improvements — two-column
9. Recommended study plan — cards with topic, reason, and resource links
10. Hiring recommendation — prominent badge at bottom
