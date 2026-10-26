// Connectivity diagnostics never publish and never transmit credentials.
export function n8nDiagnostics(env: Record<string, string | undefined>, request: typeof fetch = fetch) {
  return async (req: any, res: any) => {
    const configured = env.N8N_HEALTH_URL;
    if (!configured) return res.status(503).json({ success: false, error: 'N8N_HEALTH_URL_NOT_CONFIGURED' });
    if (req.body?.targetUrl && req.body.targetUrl !== configured) return res.status(400).json({ success: false, error: 'TARGET_OVERRIDE_FORBIDDEN' });
    let target: URL;
    try { target = new URL(configured); } catch { return res.status(503).json({ success: false, error: 'INVALID_HEALTH_URL' }); }
    if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash) return res.status(503).json({ success: false, error: 'HTTPS_HEALTH_URL_REQUIRED' });
    const diagnosis: any = { connection_status: 'UNREACHABLE', error_message: '', recommendation: 'A reachable endpoint does not prove publication readiness.' };
    try {
      const response = await request(target, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(3000) });
      diagnosis.http_status = response.status;
      diagnosis.connection_status = response.ok ? 'SUCCESS' : 'REACHED_WITH_ERROR';
      if (!response.ok) diagnosis.error_message = `HTTP ${response.status}`;
      await response.body?.cancel();
    } catch { diagnosis.error_message = 'Connection failed or timed out'; }
    return res.json({ success: true, diagnosis });
  };
}
