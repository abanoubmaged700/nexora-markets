import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { approvalReceipt } from '../src/security/approvalReceipt.ts';
import initSqlJs from 'sql.js';

const requestSecret = 'test-request-secret-01234567890123456789';
const approvalSecret = 'test-approval-secret-01234567890123456789';
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));

test('gateway rejects forged approval and confirms only acknowledged delivery', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-gateway-test-'));
  const SQL = await initSqlJs();
  const legacy = new SQL.Database();
  legacy.exec('CREATE TABLE idempotency (run_id TEXT PRIMARY KEY, created_at TEXT)');
  legacy.run('INSERT INTO idempotency (run_id, created_at) VALUES (?, ?)', ['legacy', new Date().toISOString()]);
  fs.writeFileSync(path.join(directory, 'gateway.sqlite'), Buffer.from(legacy.export()));
  legacy.close();
  let calls = 0;
  let mode = 'success';
  let onArrival;
  let release;
  const arrival = new Promise(resolve => { onArrival = resolve; });
  const pending = new Promise(resolve => { release = resolve; });
  const downstream = http.createServer(async (req, res) => {
    calls++;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    if (mode === 'hold') { onArrival(); await pending; }
    if (mode === 'error') { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end('{}'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ publication_status: 'PUBLISHED', run_id: body.run_id, telegram_message_id: calls }));
  });
  const downstreamPort = await listen(downstream);
  const probe = http.createServer();
  const gatewayPort = await listen(probe);
  await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['integrations/local_gateway/gateway.js'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: { ...process.env, GATEWAY_PORT: String(gatewayPort), GATEWAY_DB_PATH: path.join(directory, 'gateway.sqlite'),
      N8N_TARGET_URL: `http://127.0.0.1:${downstreamPort}/disposable`, N8N_WEBHOOK_SECRET: requestSecret,
      NEXORA_APPROVAL_SIGNING_SECRET: approvalSecret }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    child.kill();
    await new Promise(resolve => downstream.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  await Promise.race([
    new Promise((resolve, reject) => { child.stdout.on('data', chunk => { if (String(chunk).includes('listening')) resolve(); }); child.on('exit', code => reject(new Error(`gateway exited ${code}`))); }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('gateway start timeout')), 5000)),
  ]);

  let seq = 0;
  const post = async (runId, outputs, receipt) => {
    const body = JSON.stringify({ run_id: runId, human_approval_status: 'APPROVED', outputs, approval_receipt: receipt });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = `test_nonce_${String(++seq).padStart(16, '0')}`;
    const signature = crypto.createHmac('sha256', requestSecret).update(`${timestamp}.${nonce}.${body}`).digest('hex');
    const response = await fetch(`http://127.0.0.1:${gatewayPort}/gateway/publish`, { method: 'POST', headers: {
      'Content-Type': 'application/json', 'X-NEXORA-Timestamp': timestamp, 'X-NEXORA-Nonce': nonce, 'X-NEXORA-Signature': signature,
    }, body });
    return { status: response.status, data: await response.json() };
  };
  const approved = (runId, outputs) => approvalReceipt(runId, crypto.createHash('sha256').update(JSON.stringify(outputs)).digest('hex'), approvalSecret);
  const outputs = { news_draft_ar: 'A verified private test draft' };

  assert.equal((await post('legacy', outputs, approved('legacy', outputs))).status, 409);
  assert.equal(calls, 0, 'legacy idempotency row must not become a fresh send');

  assert.equal((await post('forged', outputs, undefined)).status, 403);
  assert.equal(calls, 0, 'caller APPROVED must not create reviewer approval');
  const proof = approved('valid', outputs);
  assert.equal((await post('valid', { news_draft_ar: 'changed' }, proof)).status, 403);
  assert.equal(calls, 0, 'changed content must not be forwarded');
  assert.equal((await post('valid', outputs, proof)).status, 200);
  assert.equal((await post('valid', outputs, proof)).status, 409);
  assert.equal(calls, 1);

  mode = 'error';
  const failure = await post('failure', outputs, approved('failure', outputs));
  assert.equal(failure.status, 502);
  assert.equal(failure.data.success, false);
  assert.equal((await post('failure', outputs, approved('failure', outputs))).status, 409);
  assert.equal(calls, 2, '503 must not trigger an unsafe retry');

  mode = 'hold';
  const first = post('concurrent', outputs, approved('concurrent', outputs));
  await arrival;
  assert.equal((await post('concurrent', outputs, approved('concurrent', outputs))).status, 409);
  release();
  assert.equal((await first).status, 200);
  assert.equal(calls, 3);
});
