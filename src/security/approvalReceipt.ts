import { createHmac } from 'node:crypto';

// The reviewer API issues this only after the approval transaction is persisted.
// The gateway verifies it without trusting a status supplied by the publisher.
export function approvalReceipt(runId: string, revision: string, secret: string | undefined): string | null {
  if (!secret || secret.length < 32) return null;
  const payload = Buffer.from(JSON.stringify({ run_id: runId, content_hash: revision, decision: 'APPROVE' })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}
