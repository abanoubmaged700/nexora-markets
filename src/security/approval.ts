import { createHash, timingSafeEqual } from 'node:crypto';

export const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function reviewerIdentity(header: unknown, env: Record<string, string | undefined>) {
  const user = env.NEXORA_REVIEWER_USER;
  const password = env.NEXORA_REVIEWER_PASSWORD;
  if (!user || !password || password.length < 24) return null;
  if (typeof header !== 'string' || !header.startsWith('Basic ')) return null;
  const supplied = createHash('sha256').update(Buffer.from(header.slice(6), 'base64')).digest();
  const expected = createHash('sha256').update(`${user}:${password}`).digest();
  return timingSafeEqual(supplied, expected) ? user : null;
}

export function approvalAuth(req: any, res: any, next: any) {
  const identity = reviewerIdentity(req.headers.authorization, process.env);
  if (!identity) {
    res.setHeader('WWW-Authenticate', 'Basic realm="NEXORA Review", charset="UTF-8"');
    return res.status(401).json({ success: false, error: 'REVIEWER_AUTH_REQUIRED' });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (!req.is('application/json')) return res.status(415).json({ error: 'JSON_REQUIRED' });
    const origin = req.headers.origin;
    if (origin && origin !== process.env.NEXORA_PUBLIC_ORIGIN) return res.status(403).json({ error: 'ORIGIN_REJECTED' });
  }
  res.locals.reviewer = identity;
  next();
}

export function approvalHandler(getDb: () => any, persist: () => void) {
  return (req: any, res: any) => {
    // Defense in depth: caller-supplied editorId is never trusted.
    if (!res.locals.reviewer) return res.status(401).json({ error: 'REVIEWER_AUTH_REQUIRED' });
    const { action, revision } = req.body || {};
    if (!['APPROVE', 'REJECT'].includes(action) || typeof revision !== 'string' || !/^[a-f0-9]{64}$/.test(revision)) {
      return res.status(400).json({ error: 'ACTION_AND_REVISION_REQUIRED' });
    }
    const db = getDb();
    if (!db) return res.status(503).json({ error: 'DATABASE_UNAVAILABLE' });
    let transaction = false;
    try {
      db.run('BEGIN IMMEDIATE'); transaction = true;
      const rows = db.exec('SELECT agent_id, validation_status, human_approval_status, contract_json FROM agent_executions WHERE run_id = ?', [req.params.runId]);
      if (!rows.length || !rows[0].values.length) { db.run('ROLLBACK'); transaction = false; return res.status(404).json({ error: 'RUN_NOT_FOUND' }); }
      const [agent, validation, status, raw] = rows[0].values[0];
      const contract = JSON.parse(raw);
      if (agent !== 'content_creator_agent' || validation !== 'VALIDATED' || status !== 'PENDING_HUMAN_APPROVAL' || !contract.draft_revision || contract.draft_revision !== revision || digest(contract.outputs) !== revision) {
        db.run('ROLLBACK'); transaction = false; return res.status(409).json({ error: 'DRAFT_STATE_OR_REVISION_CONFLICT' });
      }
      contract.human_approval_status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      contract.approval = { reviewer: res.locals.reviewer, revision, timestamp: new Date().toISOString() };
      db.run('UPDATE agent_executions SET human_approval_status = ?, contract_json = ? WHERE run_id = ?', [contract.human_approval_status, JSON.stringify(contract), req.params.runId]);
      db.run('INSERT INTO approval_decisions (run_id, agent_id, decision, editor_id, timestamp, notes) VALUES (?, ?, ?, ?, ?, ?)', [req.params.runId, agent, action, res.locals.reviewer, contract.approval.timestamp, revision]);
      db.run('COMMIT'); transaction = false;
      persist(); // Throws and invalidates the DB on disk failure; never acknowledge an unpersisted approval.
      return res.json({ success: true, run_id: req.params.runId, new_approval_status: contract.human_approval_status });
    } catch {
      if (transaction) db.run('ROLLBACK');
      return res.status(503).json({ success: false, error: 'APPROVAL_PERSISTENCE_FAILED' });
    }
  };
}
