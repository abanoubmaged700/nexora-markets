import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
import { approvalAuth, approvalHandler, digest, reviewerIdentity } from '../src/security/approval.ts';
const require = createRequire(import.meta.url);
const express = process.env.NEXORA_TEST_EXPRESS ? require(process.env.NEXORA_TEST_EXPRESS) : require('express');

test('approval HTTP and SQLite state transitions', async (t) => {
  const sql = new DatabaseSync(':memory:');
  sql.exec(`CREATE TABLE agent_executions(run_id TEXT PRIMARY KEY, agent_id TEXT, validation_status TEXT, human_approval_status TEXT, contract_json TEXT);
  CREATE TABLE approval_decisions(run_id TEXT, agent_id TEXT, decision TEXT, editor_id TEXT, timestamp TEXT, notes TEXT);`);
  const db = {
    run(q: string, args: any[] = []) { sql.prepare(q).run(...args); },
    exec(q: string, args: any[] = []) { const rows = sql.prepare(q).all(...args); return rows.length ? [{ values: rows.map(Object.values) }] : []; },
  };
  const output = { telegram_post: { headline: 'Test', formatted_text_ar: 'اختبار معزول' } };
  const revision = digest(output);
  function seed(id: string, validation = 'VALIDATED') {
    sql.prepare('INSERT INTO agent_executions VALUES (?, ?, ?, ?, ?)').run(id, 'content_creator_agent', validation, 'PENDING_HUMAN_APPROVAL', JSON.stringify({ outputs: output, draft_revision: revision }));
  }
  seed('valid'); seed('invalid', 'VALIDATION_FAILED'); seed('failure');
  process.env.NEXORA_REVIEWER_USER = 'test-editor';
  process.env.NEXORA_REVIEWER_PASSWORD = 'synthetic-test-password-only-123456';
  process.env.NEXORA_PUBLIC_ORIGIN = 'http://localhost';
  const auth = 'Basic ' + Buffer.from(`${process.env.NEXORA_REVIEWER_USER}:${process.env.NEXORA_REVIEWER_PASSWORD}`).toString('base64');
  let failPersistence = false;
  const app = express(); app.use(express.json()); app.use(approvalAuth);
  app.post('/api/executions/:runId/approval', approvalHandler(() => db, () => { if (failPersistence) throw new Error('synthetic disk error'); }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function post(id: string, body: any, authorization = auth, origin?: string) {
    return fetch(`${base}/api/executions/${id}/approval`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization, ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body) });
  }
  try {
    await t.test('anonymous request rejected, no decision', async () => { assert.equal((await post('valid', { action: 'APPROVE', revision }, '')).status, 401); assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM approval_decisions').get()!.n, 0); });
    await t.test('missing run 404', async () => assert.equal((await post('missing', { action: 'APPROVE', revision })).status, 404));
    await t.test('unknown action 400', async () => assert.equal((await post('valid', { action: 'anything', revision })).status, 400));
    await t.test('stale revision 409', async () => assert.equal((await post('valid', { action: 'APPROVE', revision: '0'.repeat(64) })).status, 409));
    await t.test('failed validation 409', async () => assert.equal((await post('invalid', { action: 'APPROVE', revision })).status, 409));
    await t.test('cross origin 403', async () => assert.equal((await post('valid', { action: 'APPROVE', revision }, auth, 'https://attacker.invalid')).status, 403));
    await t.test('valid approval once, reviewer is server identity', async () => {
      assert.equal((await post('valid', { action: 'APPROVE', revision, editorId: 'forged' })).status, 200);
      assert.equal((await post('valid', { action: 'APPROVE', revision })).status, 409);
      assert.equal(sql.prepare('SELECT editor_id FROM approval_decisions').get()!.editor_id, 'test-editor');
      const row = sql.prepare('SELECT * FROM agent_executions WHERE run_id = ?').get('valid')!;
      assert.equal(row.human_approval_status, 'APPROVED'); assert.equal(JSON.parse(String(row.contract_json)).human_approval_status, 'APPROVED');
    });
    await t.test('persistence error never acknowledged', async () => { failPersistence = true; assert.equal((await post('failure', { action: 'APPROVE', revision })).status, 503); });
    await t.test('missing reviewer config fails closed', () => assert.equal(reviewerIdentity(auth, {}), null));
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(resolve)); sql.close(); }
});
