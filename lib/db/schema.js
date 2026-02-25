import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
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
    targetRole: text('targetRole').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, withTimezone: false }).defaultNow().notNull(),
});

export const interviewSessions = pgTable('InterviewSessions', {
    id: text('id').default(sql`gen_random_uuid()`).primaryKey(),
    presetId: text('presetId').notNull().references(() => interviewPresets.id),
    audioLocation: text('audioLocation').notNull(),
    preInterviewReport: jsonb('preInterviewReport'),
    postInterviewReport: jsonb('postInterviewReport'),
    createdAt: timestamp('createdAt', { precision: 3, withTimezone: false }).defaultNow().notNull(),
});
