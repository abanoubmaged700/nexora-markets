import crypto from 'crypto';
import http from 'http';

const SECRET = 'test_secret_key_1234567890abcdef';
const PORT = 3001;
const BASE_URL = `http://127.0.0.1:${PORT}/gateway/publish`;

function makeRequest(headers, bodyObj) {
  return new Promise((resolve, reject) => {
    const rawBody = JSON.stringify(bodyObj);
    const req = http.request(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.write(rawBody);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting NEXORA Gateway Security Test Suite...');

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = 'nonce_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const payload = {
    run_id: 'test_run_' + Date.now(),
    agent_id: 'economic_news_agent',
    human_approval_status: 'APPROVED',
    outputs: { news_draft_ar: 'اختبار النشر الآمن' }
  };

  const rawBody = JSON.stringify(payload);
  const canonical = `${timestamp}.${nonce}.${rawBody}`;
  const validSignature = crypto.createHmac('sha256', SECRET).update(canonical, 'utf8').digest('hex');

  // Test 1: Valid Request
  console.log('\n[Test 1] Valid Request with correct HMAC signature...');
  const res1 = await makeRequest({
    'x-nexora-timestamp': timestamp,
    'x-nexora-nonce': nonce,
    'x-nexora-signature': validSignature
  }, payload);
  console.log(`Status: ${res1.status}`, res1.body);

  // Test 2: Nonce Replay
  console.log('\n[Test 2] Nonce Replay Attack (reusing nonce)...');
  const res2 = await makeRequest({
    'x-nexora-timestamp': timestamp,
    'x-nexora-nonce': nonce,
    'x-nexora-signature': validSignature
  }, payload);
  console.log(`Status: ${res2.status} (Expected 403)`, res2.body);

  // Test 3: Duplicate run_id (Idempotency check)
  console.log('\n[Test 3] Duplicate run_id (Idempotency check)...');
  const nonce3 = 'nonce_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const canonical3 = `${timestamp}.${nonce3}.${rawBody}`;
  const validSig3 = crypto.createHmac('sha256', SECRET).update(canonical3, 'utf8').digest('hex');
  const res3 = await makeRequest({
    'x-nexora-timestamp': timestamp,
    'x-nexora-nonce': nonce3,
    'x-nexora-signature': validSig3
  }, payload);
  console.log(`Status: ${res3.status} (Expected 400)`, res3.body);

  // Test 4: Expired Timestamp
  console.log('\n[Test 4] Expired Timestamp...');
  const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
  const nonce4 = 'nonce_' + Date.now();
  const canonical4 = `${oldTimestamp}.${nonce4}.${rawBody}`;
  const sig4 = crypto.createHmac('sha256', SECRET).update(canonical4, 'utf8').digest('hex');
  const res4 = await makeRequest({
    'x-nexora-timestamp': oldTimestamp,
    'x-nexora-nonce': nonce4,
    'x-nexora-signature': sig4
  }, payload);
  console.log(`Status: ${res4.status} (Expected 401)`, res4.body);

  // Test 5: Invalid Signature
  console.log('\n[Test 5] Invalid HMAC Signature...');
  const nonce5 = 'nonce_' + Date.now();
  const res5 = await makeRequest({
    'x-nexora-timestamp': timestamp,
    'x-nexora-nonce': nonce5,
    'x-nexora-signature': 'deadbeef'
  }, payload);
  console.log(`Status: ${res5.status} (Expected 403)`, res5.body);

  console.log('\n✅ Automated security tests completed.');
}

runTests().catch(console.error);
