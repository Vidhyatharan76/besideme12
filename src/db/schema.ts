import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  preferredLanguage: text('preferred_language').notNull().default('en'),
  localLanguage: text('local_language').notNull().default('en'),
  familyRole: text('family_role').notNull().default('parent'),
  focusVisits: text('focus_visits').notNull().default('[]'),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const customWords = pgTable('custom_words', {
  id: text('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  userWord: text('user_word').notNull(),
  localWord: text('local_word').notNull(),
  category: text('category').notNull().default('general'),
  known: boolean('known').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const starterWordProgress = pgTable(
  'starter_word_progress',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid')
      .references(() => users.uid, { onDelete: 'cascade' })
      .notNull(),
    wordId: text('word_id').notNull(),
    known: boolean('known').notNull().default(true),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('starter_word_progress_uid_word_idx').on(table.userUid, table.wordId),
  ],
);

export const questionProgress = pgTable(
  'question_progress',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid')
      .references(() => users.uid, { onDelete: 'cascade' })
      .notNull(),
    questionId: text('question_id').notNull(),
    practiced: boolean('practiced').notNull().default(false),
    chosenForSheet: boolean('chosen_for_sheet').notNull().default(false),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('question_progress_uid_question_idx').on(table.userUid, table.questionId),
  ],
);

export const customScenarios = pgTable('custom_scenarios', {
  id: text('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  languageCode: text('language_code').notNull().default('en'),
  languageName: text('language_name').notNull().default('English'),
  localLanguageCode: text('local_language_code').notNull().default('en'),
  title: text('title').notNull(),
  titleEnglish: text('title_english').notNull(),
  shortTitle: text('short_title').notNull(),
  summary: text('summary').notNull().default(''),
  isHealthRelated: boolean('is_health_related').notNull().default(false),
  steps: jsonb('steps').notNull().default([]),
  questions: jsonb('questions').notNull().default([]),
  words: jsonb('words').notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const translationCache = pgTable(
  'translation_cache',
  {
    id: serial('id').primaryKey(),
    sourceHash: text('source_hash').notNull(),
    targetLanguage: text('target_language').notNull(),
    translatedText: text('translated_text').notNull(),
    status: text('status').notNull().default('machine'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('translation_cache_hash_lang_idx').on(
      table.sourceHash,
      table.targetLanguage,
    ),
    check('translation_cache_status_check', sql`${table.status} IN ('machine', 'reviewed')`),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  customWords: many(customWords),
  customScenarios: many(customScenarios),
  starterWordProgress: many(starterWordProgress),
  questionProgress: many(questionProgress),
}));

export const customWordsRelations = relations(customWords, ({ one }) => ({
  user: one(users, {
    fields: [customWords.userUid],
    references: [users.uid],
  }),
}));

export const customScenariosRelations = relations(customScenarios, ({ one }) => ({
  user: one(users, {
    fields: [customScenarios.userUid],
    references: [users.uid],
  }),
}));

export const starterWordProgressRelations = relations(starterWordProgress, ({ one }) => ({
  user: one(users, {
    fields: [starterWordProgress.userUid],
    references: [users.uid],
  }),
}));

export const questionProgressRelations = relations(questionProgress, ({ one }) => ({
  user: one(users, {
    fields: [questionProgress.userUid],
    references: [users.uid],
  }),
}));
