import { pgTable, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('User', {
    id: text('id').default(sql`gen_random_uuid()`).primaryKey(),
    clerkId: text('clerkId').notNull().unique(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    githubProfile: text('githubProfile'),
    createdAt: timestamp('createdAt', { precision: 3, withTimezone: false }).defaultNow().notNull(),
});

export const interviewPresets = pgTable('InterviewPreset', {
    id: text('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: text('userId').notNull().references(() => users.id),
    jobDescription: text('jobDescription').notNull(),
    resumeLocation: text('resumeLocation').notNull(),
    resumeName: text('resumeName'),
    githubUrl: text('githubUrl'),
    targetRole: text('targetRole').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, withTimezone: false }).defaultNow().notNull(),
});

export const interviewSessions = pgTable('InterviewSessions', {
    id: text('id').default(sql`gen_random_uuid()`).primaryKey(),
    presetId: text('presetId').notNull().references(() => interviewPresets.id),
    audioLocation: text('audioLocation'),
    preInterviewReport: jsonb('preInterviewReport'),
    postInterviewReport: jsonb('postInterviewReport'),
    systemPrompt: text('systemPrompt'),
    createdAt: timestamp('createdAt', { precision: 3, withTimezone: false }).defaultNow().notNull(),
});

// ─── Coding Round Tables ──────────────────────────────────────

export const questionBank = pgTable('QuestionBank', {
    id: text('id').default(sql`gen_random_uuid()`).primaryKey(),
    type: text('type').notNull(),                    // 'dsa' | 'bugfix'
    difficulty: text('difficulty').notNull(),         // 'easy' | 'medium' | 'hard'
    tags: jsonb('tags').notNull(),                    // ["arrays", "hashmap"]
    roleTags: jsonb('roleTags').notNull(),            // ["sde", "backend", "fullstack"]
    title: text('title').notNull(),
    description: text('description').notNull(),
    starterCode: text('starterCode').notNull(),       // JS only
    testCases: jsonb('testCases').notNull(),           // [{ input, expectedOutput }]
    sampleIO: jsonb('sampleIO'),                       // visible examples
    idealSolution: text('idealSolution'),
    createdAt: timestamp('createdAt', { precision: 3, withTimezone: false }).defaultNow().notNull(),
});

export const codingRounds = pgTable('CodingRound', {
    id: text('id').default(sql`gen_random_uuid()`).primaryKey(),
    sessionId: text('sessionId').notNull().references(() => interviewSessions.id),
    status: text('status').notNull().default('pending'), // 'pending' | 'in_progress' | 'completed'
    overallScore: integer('overallScore'),
    overallFeedback: text('overallFeedback'),
    createdAt: timestamp('createdAt', { precision: 3, withTimezone: false }).defaultNow().notNull(),
});

export const codingSubmissions = pgTable('CodingSubmission', {
    id: text('id').default(sql`gen_random_uuid()`).primaryKey(),
    roundId: text('roundId').notNull().references(() => codingRounds.id),
    questionId: text('questionId').notNull().references(() => questionBank.id),
    questionNumber: integer('questionNumber').notNull(),
    userCode: text('userCode'),
    testResults: jsonb('testResults'),               // [{ input, expected, actual, passed }]
    testsPassed: integer('testsPassed'),
    testsTotal: integer('testsTotal'),
    aiScore: integer('aiScore'),
    aiFeedback: jsonb('aiFeedback'),
    createdAt: timestamp('createdAt', { precision: 3, withTimezone: false }).defaultNow().notNull(),
});
