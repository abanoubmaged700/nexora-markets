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
  console.log('🧪 Starting NEXORA Gateway Advanced Security & Concurrency Test Suite...');

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const runId = 'test_run_' + Date.now();
  const payload = {
    run_id: runId,
    agent_id: 'economic_news_agent',
    human_approval_status: 'APPROVED',
    outputs: { news_draft_ar: 'خبر اقتصادي معتمد وآمن' }
  };

  const rawBody = JSON.stringify(payload);
  const nonce = 'nonce_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const canonical = `${timestamp}.${nonce}.${rawBody}`;
  const validSignature = crypto.createHmac('sha256', SECRET).update(canonical, 'utf8').digest('hex');

  // Test 1: Valid Request (First time registers approval & fingerprint, attempts forward)
  console.log('\n[Test 1] Valid Request with Fingerprint Binding...');
  const res1 = await makeRequest({
    'x-nexora-timestamp': timestamp,
    'x-nexora-nonce': nonce,
    'x-nexora-signature': validSignature
  }, payload);
  console.log(`Status: ${res1.status}`, res1.body);

  // Test 2: Forged Approval / Modified Content Fingerprint (Tampering detection)
  console.log('\n[Test 2] Tampered Content (Fingerprint Mismatch Test)...');
  const tamperedPayload = {
    ...payload,
    outputs: { news_draft_ar: 'خبر تم تعديله خبيثاً بعد الاعتماد!' }
  };
  const rawBodyTampered = JSON.stringify(tamperedPayload);
  const nonce2 = 'nonce_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const canonical2 = `${timestamp}.${nonce2}.${rawBodyTampered}`;
  const validSig2 = crypto.createHmac('sha256', SECRET).update(canonical2, 'utf8').digest('hex');

  const res2 = await makeRequest({
    'x-nexora-timestamp': timestamp,
    'x-nexora-nonce': nonce2,
    'x-nexora-signature': validSig2
  }, tamperedPayload);
  console.log(`Status: ${res2.status} (Expected 403)`, res2.body);

  // Test 3: Concurrency / IN_FLIGHT test (Simulating simultaneous requests for same run_id)
  console.log('\n[Test 3] Concurrency / Race Condition Test (IN_FLIGHT lock)...');
  const runIdConcurrent = 'concurrent_run_' + Date.now();
  const concurrentPayload = { ...payload, run_id: runIdConcurrent };
  const rawBodyConc = JSON.stringify(concurrentPayload);
  
  const nonce3a = 'nonce_a_' + Date.now();
  const sig3a = crypto.createHmac('sha256', SECRET).update(`${timestamp}.${nonce3a}.${rawBodyConc}`).digest('hex');
  
  const nonce3b = 'nonce_b_' + Date.now();
  const sig3b = crypto.createHmac('sha256', SECRET).update(`${timestamp}.${nonce3b}.${rawBodyConc}`).digest('hex');

  // Fire two concurrent requests
  const [conc1, conc2] = await Promise.all([
    makeRequest({ 'x-nexora-timestamp': timestamp, 'x-nexora-nonce': nonce3a, 'x-nexora-signature': sig3a }, concurrentPayload),
    makeRequest({ 'x-nexora-timestamp': timestamp, 'x-nexora-nonce': nonce3b, 'x-nexora-signature': sig3b }, concurrentPayload)
  ]);
  console.log('Concurrent Req 1 Status:', conc1.status, conc1.body);
  console.log('Concurrent Req 2 Status:', conc2.status, conc2.body);

  console.log('\n✅ Advanced Security & Concurrency Tests Completed.');
}

runTests().catch(console.error);
