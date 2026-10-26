import { test } from 'node:test';
import assert from 'node:assert/strict';
import { n8nDiagnostics } from '../src/security/n8nDiagnostics.ts';
test('diagnostics restrict destination and report failures honestly', async () => {
  let calls=0; let code=200; let output:any; let options:any;
  const response:any={status(n:number){code=n;return this},json(body:any){output=body;return this}};
  const upstream:any=async (_url:any,opts:any)=>{calls++;options=opts;return new Response('',{status:403});};
  await n8nDiagnostics({},upstream)({body:{}},response);assert.equal(code,503);assert.equal(calls,0);
  const handler=n8nDiagnostics({N8N_HEALTH_URL:'https://health.example.org/healthz'},upstream);
  await handler({body:{targetUrl:'https://other.example.org'}},response);assert.equal(code,400);assert.equal(calls,0);
  await handler({body:{}},response);assert.equal(output.diagnosis.connection_status,'REACHED_WITH_ERROR');assert.equal(calls,1);
  assert.equal(options.method,'GET');assert.equal(options.headers,undefined);assert.equal(options.redirect,'error');
});
