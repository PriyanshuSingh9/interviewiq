# Data Schemas & Redis Keys

This file serves as the single source of truth for all structured data passed between the Next.js frontend, the Bridge Server, and Gemini.

## 1. Candidate Profile Schema (Phase 1 Output to Redis)
**Key:** `context:{sessionId}`

```json
{
  "candidateName": "string",
  "candidateLevel": "junior|mid|senior",
  "yearsExperience": 0,
  "targetRoleFocus": "string — specific role description",

  "skillAssessment": {
    "strong": ["skill1"],
    "moderate": ["skill2"],
    "gapsVsJD": ["skill3"]
  },

  "fitScore": 85,
  "fitSummary": "2-3 sentences on fit and key gaps",

  "architecturalSkeletons": [
    {
      "repoName": "string",
      "inferredPurpose": "What does this project do based on the skeleton?",
      "inferredStack": ["tech1", "tech2"],
      "architecturalObservations": ["observation about structure/design choices"],
      "aggressiveQuestions": [
        "Specific, hard architectural question referencing actual files/deps seen",
        "Tradeoff question: why X over Y given what you see",
        "Scalability or failure scenario question"
      ]
    }
  ],

  "interviewPlan": {
    "totalTurns": 14,
    "rounds": [
      {
        "id": "resume_deep_dive",
        "name": "Resume Deep Dive",
        "focus": "Probe architectural choices in their top project",
        "turnCount": 5,
        "openingLine": "Exact opening question to ask verbatim",
        "keyTopicsToHit": ["topic1", "topic2"],
        "transitionLine": "Exact line to say when moving to next round"
      },
      {
        "id": "system_design",
        "name": "System Design",
        "focus": "Scale a component from their actual project",
        "turnCount": 5,
        "openingLine": "string",
        "keyTopicsToHit": [],
        "transitionLine": "string"
      },
      {
        "id": "behavioral",
        "name": "Behavioral",
        "focus": "Past conflict or failure, specifically technical",
        "turnCount": 3,
        "openingLine": "string",
        "keyTopicsToHit": [],
        "transitionLine": null
      },
      {
        "id": "closing",
        "name": "Closing",
        "focus": "Candidate questions + wrap up",
        "turnCount": 1,
        "openingLine": "That covers everything from my side. Do you have any questions for me?",
        "keyTopicsToHit": [],
        "transitionLine": null
      }
    ],
    "priorityTopicsGlobal": ["topic1"],
    "redFlagsToProbe": ["flag1"]
  }
}
```

## 2. Live Session State Schema
**Key:** `state:{sessionId}`

```json
{
  "sessionId": "string",
  "currentRoundId": "resume_deep_dive",
  "currentRoundIndex": 0,
  "turnsInCurrentRound": 0,
  "totalTurns": 0,
  "interviewStartedAt": 1234567890,
  "lastCandidateTurnStartedAt": null,
  "lastInterruptAt": null,
  "interviewComplete": false,
  "transcript": []
}
```

## 3. Post-Interview Report Schema
**Key:** `report:{sessionId}`

```json
{
  "overallScore": 85,
  "overallGrade": "A|B|C|D|F",
  "executiveSummary": "3-4 sentences — what would a senior engineer say about this candidate?",

  "dimensions": {
    "technicalDepth": {
      "score": 8,
      "assessment": "paragraph",
      "strongMoments": ["[4:05] — correctly explained token bucket with sorted sets"],
      "weakMoments": ["[7:22] — could not explain why Redis over Memcached"]
    },
    "communicationClarity": {
      "score": 8,
      "assessment": "paragraph",
      "fillerWordObservation": "string"
    },
    "problemSolvingApproach": {
      "score": 8,
      "assessment": "paragraph"
    },
    "projectOwnership": {
      "score": 8,
      "assessment": "Did they sound like they actually built this, or like they read about it?"
    },
    "pressureHandling": {
      "score": 8,
      "assessment": "How did they respond when interrupted or pushed back on?"
    }
  },

  "topicBreakdown": [
    {
      "topic": "string",
      "performance": "strong|adequate|weak|avoided",
      "timestampFormatted": "4:05",
      "notes": "string"
    }
  ],

  "interruptionAnalysis": {
    "timesInterrupted": 2,
    "recoveryQuality": "strong|adequate|poor",
    "notes": "string"
  },

  "redFlagFindings": [
    { "flag": "string", "finding": "confirmed|cleared|not_probed" }
  ],

  "strengths": ["strength1"],
  "areasForImprovement": ["area1"],
  "recommendedStudy": [
    { "topic": "string", "reason": "string", "resources": ["string"] }
  ],

  "hiringRecommendation": "strong_yes|yes|maybe|no",
  "interviewerNotes": "What a human interviewer would write in their internal debrief"
}
```

## 4. System Prompts Schema
**Key:** `systemprompts:{sessionId}`
```json
{
  "resume_deep_dive": "...",
  "system_design": "...",
  "behavioral": "...",
  "closing": "..."
}
```
