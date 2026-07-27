import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

describe('messages migration (20260722000006)', () => {
  const sql = readFileSync(join(migrationsDir, '20260722000006_create_messages.sql'), 'utf8');

  it('creates messages table', () => {
    expect(sql).toMatch(/CREATE TABLE.*messages/);
  });

  it('has tenant_id FK to tenants', () => {
    expect(sql).toMatch(/tenant_id.*REFERENCES\s+tenants\(id\)/i);
  });

  it('has sender_role with CHECK constraint', () => {
    expect(sql).toMatch(/sender_role.*CHECK\s*\(.*IN\s*\(/i);
  });

  it('has RLS enabled', () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
  });

  it('has tenant isolation policy', () => {
    expect(sql).toMatch(/messages_tenant_isolation/i);
  });

  it('has participant access policy', () => {
    expect(sql).toMatch(/messages_participant_access/i);
  });

  it('has insert policy', () => {
    expect(sql).toMatch(/messages_insert_own/i);
  });

  it('has indexes on tenant_id + conversation_id', () => {
    expect(sql).toMatch(/idx_messages_conversation/i);
    expect(sql).toMatch(/idx_messages_sender/i);
    expect(sql).toMatch(/idx_messages_recipient/i);
  });
});

describe('exams migration (20260722000007)', () => {
  const sql = readFileSync(join(migrationsDir, '20260722000007_create_exams.sql'), 'utf8');

  it('creates exams table', () => {
    expect(sql).toMatch(/CREATE TABLE.*exams/);
  });

  it('creates exam_results table', () => {
    expect(sql).toMatch(/CREATE TABLE.*exam_results/);
  });

  it('has RLS on both tables', () => {
    expect(sql).toMatch(/ALTER TABLE.*exams.*ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/ALTER TABLE.*exam_results.*ENABLE ROW LEVEL SECURITY/i);
  });

  it('exam_results has unique constraint on (exam_id, student_id, subject_id)', () => {
    expect(sql).toMatch(/UNIQUE\s*\(exam_id,\s*student_id,\s*subject_id\)/i);
  });

  it('exam_results has score CHECK >= 0', () => {
    expect(sql).toMatch(/CHECK\s*\(score\s*>=\s*0\)/i);
  });

  it('exam_results has FK to exams with CASCADE', () => {
    expect(sql).toMatch(/REFERENCES\s+exams\(id\)\s+ON\s+DELETE\s+CASCADE/i);
  });

  it('exam_results has FK to students with CASCADE', () => {
    expect(sql).toMatch(/REFERENCES\s+students\(id\)\s+ON\s+DELETE\s+CASCADE/i);
  });
});
