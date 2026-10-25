import { approvalAuth, approvalHandler, digest } from './src/security/approval.js';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { NEXORA_AGENTS } from './src/data/agentDefinitions.js';
import { initDatabase, getDb, saveDatabaseToDisk } from './src/db/sqliteDatabase.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '1mb' }));
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path === '/n8n/webhook') return next();
  return approvalAuth(req, res, next);
});

// Initialize GoogleGenAI SDK safely
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    hasApiKey: Boolean(ai),
    defaultModel: 'gemini-3.8-flash',
    fallbackModel: 'gemini-3.1-flash-lite',
    cairoTime: new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Africa/Cairo',
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date()),
    timestampIso: new Date().toISOString(),
  });
});

// Get Central Execution Logs & Health Metrics from SQLite
app.get('/api/telemetry/metrics', (req: Request, res: Response) => {
  const db = getDb();
  if (!db) {
    return res.status(500).json({ success: false, error: 'Database not initialized' });
  }

  try {
    // Query agent_health
    const healthRes = db.exec('SELECT * FROM agent_health;');
    const agents = healthRes.length > 0 ? healthRes[0].values.map((row: any[]) => {
      const cols = healthRes[0].columns;
      const obj: any = {};
      cols.forEach((c: string, idx: number) => { obj[c] = row[idx]; });
      const successRate = obj.total_runs > 0 ? Number(((obj.successful_runs / obj.total_runs) * 100).toFixed(1)) : 100;
      let status = 'HEALTHY';
      if (obj.failed_runs > 0 && obj.successful_runs === 0) status = 'ERROR';
      else if (obj.failed_runs > obj.successful_runs) status = 'DEGRADED';
      else if (obj.total_runs === 0) status = 'IDLE';

      return {
        agent_id: obj.agent_id,
        status,
        total_runs: obj.total_runs,
        successful_runs: obj.successful_runs,
        failed_runs: obj.failed_runs,
        success_rate: successRate,
        avg_latency_ms: obj.avg_latency_ms,
        last_successful_run: obj.last_successful_run,
        last_error: obj.last_error,
        total_tokens: obj.total_tokens,
        estimated_cost_usd: obj.total_cost_usd,
        model_used: obj.last_model_used,
        last_validation: obj.last_validation,
      };
    }) : [];

    // Query recent agent_executions
    const execRes = db.exec('SELECT * FROM agent_executions ORDER BY id DESC LIMIT 50;');
    const recent_logs = execRes.length > 0 ? execRes[0].values.map((row: any[]) => {
      const cols = execRes[0].columns;
      const obj: any = {};
      cols.forEach((c: string, idx: number) => { obj[c] = row[idx]; });
      return {
        run_id: obj.run_id,
        agent_id: obj.agent_id,
        timestamp: obj.timestamp,
        timezone: obj.timezone,
        source: obj.source,
        model_used: obj.model_used,
        latency_ms: obj.latency_ms,
        validation_status: obj.validation_status,
        human_approval_status: obj.human_approval_status,
        errors: obj.errors_json ? JSON.parse(obj.errors_json) : [],
        contract: obj.contract_json ? JSON.parse(obj.contract_json) : null,
      };
    }) : [];

    // Global stats
    const globalRes = db.exec('SELECT SUM(total_runs), SUM(total_tokens), SUM(total_cost_usd) FROM agent_health;');
    const globalRow = globalRes.length > 0 ? globalRes[0].values[0] : [0, 0, 0];

    res.json({
      success: true,
      agents,
      recent_logs,
      global_stats: {
        total_executions: globalRow[0] || 0,
        total_tokens: globalRow[1] || 0,
        total_cost_usd: Number((globalRow[2] || 0).toFixed(4)),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Deterministic risk calculations helper
function calculateRiskMetrics(data: any) {
  const accountEquity = Number(data.accountEquity || 10000);
  const entryPrice = Number(data.entryPrice || 0);
  const stopLoss = Number(data.stopLoss || 0);
  const takeProfit = Number(data.takeProfit || 0);
  const positionUnits = Number(data.positionUnits || 0);
  const currentDrawdownPct = Number(data.currentDrawdownPct || 0);

  const priceRiskPerUnit = Math.abs(entryPrice - stopLoss);
  const totalMonetaryRisk = priceRiskPerUnit * positionUnits;
  const riskPercentage = accountEquity > 0 ? (totalMonetaryRisk / accountEquity) * 100 : 0;
  
  const potentialProfitPerUnit = Math.abs(takeProfit - entryPrice);
  const totalPotentialProfit = potentialProfitPerUnit * positionUnits;
  const riskRewardRatio = priceRiskPerUnit > 0 ? Number((potentialProfitPerUnit / priceRiskPerUnit).toFixed(2)) : 0;

  const violations: string[] = [];
  for (const field of ['accountEquity','entryPrice','stopLoss','takeProfit','positionUnits']) {
    if (typeof data[field] !== 'number' || !Number.isFinite(data[field]) || data[field] <= 0) violations.push('Invalid required risk input: ' + field);
  }
  if (priceRiskPerUnit === 0 || !Number.isFinite(riskPercentage) || !Number.isFinite(riskRewardRatio)) violations.push('Invalid risk calculation');
  if (riskPercentage > 2.0) {
    violations.push(`تجاوز حد المخاطرة للصفقة الواحدة (${riskPercentage.toFixed(2)}% > الحد الأقصى 2.0%)`);
  }
  if (currentDrawdownPct > 5.0) {
    violations.push(`تجاوز حد التراجع اليومي المسموح به (${currentDrawdownPct.toFixed(2)}% > الحد الأقصى 5.0%)`);
  }
  if (riskRewardRatio < 1.5 && riskRewardRatio > 0) {
    violations.push(`نسبة العائد إلى المخاطرة غير مقبولة (${riskRewardRatio}R < الحد الأدنى 1.5R)`);
  }

  return {
    accountEquity,
    entryPrice,
    stopLoss,
    takeProfit,
    positionUnits,
    priceRiskPerUnit,
    totalMonetaryRisk: Number(totalMonetaryRisk.toFixed(2)),
    riskPercentage: Number(riskPercentage.toFixed(2)),
    riskRewardRatio,
    potentialProfit: Number(totalPotentialProfit.toFixed(2)),
    currentDrawdownPct,
    isCompliant: violations.length === 0,
    violations,
    maxAllowedRiskPct: 2.0,
    maxDailyDrawdownPct: 5.0,
  };
}

// Strict Schema & Anti-Hallucination Validator
function validateAgentOutput(agentId: string, parsedOutput: any, inputs: any) {
  const errors: string[] = [];
  if (!parsedOutput || typeof parsedOutput !== 'object' || Array.isArray(parsedOutput)) {
    return { isValid: false, errors: ['Output is not a valid JSON object'] };
  }

  const schema = NEXORA_AGENTS.find(a => a.id === agentId)?.outputSchemaJson;
  if (!schema) errors.push('Unknown agent');
  for (const field of schema?.required || []) {
    if (parsedOutput[field] === undefined || parsedOutput[field] === null) errors.push('Missing required output: ' + field);
  }

  if (agentId === 'economic_news_agent') {
    if (!parsedOutput.event_name_ar && !parsedOutput.event_name) {
      errors.push('Missing event name in economic news output');
    }
    if (inputs?.actual !== undefined && inputs.actual !== parsedOutput.figures?.actual) {
      errors.push(`Hallucination warning: Input actual (${inputs.actual}) does not match output actual (${parsedOutput.figures.actual})`);
    }
  }

  if (agentId === 'risk_guardian_agent') {
    if (parsedOutput.compliance_check === undefined && !parsedOutput.status) {
      errors.push('Missing compliance verdict in Risk Guardian output');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Bounded Exponential Backoff execution helper with Model Failover
async function executeGeminiWithRetry(
  promptContent: string,
  systemInstruction: string,
  primaryModel: string,
  responseSchema?: any,
  temperature: number = 0.2
) {
  if (!ai) {
    throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
  }

  const modelsToTry = [
    primaryModel || 'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest'
  ];

  let lastError: any = null;
  let attemptsCount = 0;

  for (const modelName of modelsToTry) {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      attemptsCount++;
      try {
        const config: any = {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          temperature: temperature,
        };

        if (responseSchema) {
          config.responseSchema = responseSchema;
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptContent,
          config: config,
        });

        return {
          response,
          modelUsed: modelName,
          attempts: attemptsCount,
        };
      } catch (err: any) {
        lastError = err;
        const status = Number(err.status || err.code);
        if (![408, 429, 500, 502, 503, 504].includes(status)) throw err;
        console.warn(`[NEXORA Retry] Model ${modelName} attempt ${attempt} failed with status ${status}`);
        const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 200, 5000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error('All model failover and retry attempts exhausted');
}

// Agent Execution Endpoint with SQLite Persistence
app.post('/api/gemini/agent-run', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const {
    agentId,
    systemInstruction,
    inputPayload,
    model = 'gemini-3.8-flash',
    forceDeterministicRisk = false,
  } = req.body;

  const definition = NEXORA_AGENTS.find(a => a.id === agentId);
  if (!definition || !inputPayload || typeof inputPayload !== 'object' || Array.isArray(inputPayload)) return res.status(400).json({ error: 'INVALID_AGENT_OR_INPUT' });
  if (definition.requiredInputData.some(f => f.required && inputPayload[f.field] === undefined)) return res.status(400).json({ error: 'MISSING_REQUIRED_INPUT' });
  if (systemInstruction || forceDeterministicRisk || (req.body.model && req.body.model !== definition.recommendedModel)) return res.status(400).json({ error: 'POLICY_OVERRIDE_FORBIDDEN' });
  if (!getDb()) return res.status(503).json({ error: 'DATABASE_UNAVAILABLE' });

  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cairoTimeIso = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
  const nowIso = new Date().toISOString();

  let deterministicMathResult = null;
  if (agentId === 'risk_guardian_agent' || forceDeterministicRisk) {
    deterministicMathResult = calculateRiskMetrics(inputPayload);
  }

  const db = getDb();

  if (!ai) {
    const latency = Date.now() - startTime;
    const errText = 'خطأ حرج: لم يتم توفير مفتاح GEMINI_API_KEY في بيئة الخادم.';
    
    if (db) {
      db.run(
        `INSERT INTO api_error_logs (run_id, agent_id, error_message, timestamp) VALUES (?, ?, ?, ?);`,
        [runId, agentId, errText, nowIso]
      );
      saveDatabaseToDisk();
    }

    return res.status(503).json({ success: false, error: errText, run_id: runId });
  }

  const agentDef = NEXORA_AGENTS.find((a) => a.id === agentId);

  const promptContent = `
Current System Time (Africa/Cairo): ${cairoTimeIso}
Agent ID: ${agentId}
Run ID: ${runId}

Input Data:
${JSON.stringify(inputPayload, null, 2)}

${deterministicMathResult ? `DETERMINISTIC VERIFIED MATH METRICS (DO NOT RECALCULATE, USE AS TRUTH):\n${JSON.stringify(deterministicMathResult, null, 2)}` : ''}

Instructions:
Process the input data strictly according to your system instructions.
You MUST output valid JSON conforming strictly to the NEXORA Message Contract v1.2 and the required output schema.
Never hallucinate numbers, prices, or sources.
Respond in Arabic for analytical and descriptive fields, and maintain English for technical terms and symbol codes.
`;

  try {
    const { response, modelUsed, attempts } = await executeGeminiWithRetry(
      promptContent,
      systemInstruction || agentDef?.systemPrompt || 'You are an institutional financial AI agent.',
      model,
      agentDef?.outputSchemaJson,
      agentDef?.temperature || 0.2
    );

    const latencyMs = Date.now() - startTime;
    const rawText = response?.text || '{}';
    
    let parsedJson: any = {};
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        parsedJson = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
      } else {
        parsedJson = { raw: rawText };
      }
    }

    if (parsedJson?.agent_id || parsedJson?.outputs || parsedJson?.human_approval_status) {
      throw new Error('MODEL_CONTRACT_FIELDS_FORBIDDEN');
    }
    const validation = validateAgentOutput(agentId, parsedJson, inputPayload);
    const validationStatus = validation.isValid ? 'VALIDATED' : 'VALIDATION_FAILED';

    const usageMetadata = response?.usageMetadata || {};
    const promptTokens = usageMetadata.promptTokenCount || 0;
    const completionTokens = usageMetadata.candidatesTokenCount || 0;
    const totalTokens = usageMetadata.totalTokenCount || (promptTokens + completionTokens);
    const estimatedCostUsd = 0; // Cost unknown: do not fabricate billing estimates.

    const finalContract = standardizeContract(
      agentId,
      runId,
      nowIso,
      inputPayload,
      parsedJson,
      deterministicMathResult,
      validationStatus,
      validation.errors
    );

    // Save to SQLite db
    if (db) {
      db.run(
        `INSERT INTO agent_executions (run_id, agent_id, timestamp, timezone, source, model_requested, model_used, attempts, latency_ms, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, validation_status, human_approval_status, errors_json, contract_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          runId,
          agentId,
          nowIso,
          'Africa/Cairo',
          'UI_WORKBENCH',
          model,
          modelUsed,
          attempts,
          latencyMs,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCostUsd,
          validationStatus,
          finalContract.human_approval_status,
          JSON.stringify(validation.errors),
          JSON.stringify(finalContract),
        ]
      );

      // Update or insert agent_health
      const checkHealth = db.exec('SELECT * FROM agent_health WHERE agent_id = ?', [agentId]);
      if (checkHealth.length === 0 || checkHealth[0].values.length === 0) {
        db.run(
          `INSERT INTO agent_health (agent_id, status, total_runs, successful_runs, failed_runs, avg_latency_ms, last_successful_run, total_tokens, total_cost_usd, last_model_used, last_validation) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            agentId,
            validation.isValid ? 'HEALTHY' : 'DEGRADED',
            validation.isValid ? 1 : 0,
            validation.isValid ? 0 : 1,
            latencyMs,
            validation.isValid ? cairoTimeIso : null,
            totalTokens,
            estimatedCostUsd,
            modelUsed,
            validationStatus,
          ]
        );
      } else {
        db.run(
          `UPDATE agent_health SET total_runs = total_runs + 1, successful_runs = successful_runs + ?, failed_runs = failed_runs + ?, avg_latency_ms = (avg_latency_ms * total_runs + ?) / (total_runs + 1), last_successful_run = COALESCE(?, last_successful_run), total_tokens = total_tokens + ?, total_cost_usd = total_cost_usd + ?, last_model_used = ?, last_validation = ? WHERE agent_id = ?;`,
          [
            validation.isValid ? 1 : 0,
            validation.isValid ? 0 : 1,
            latencyMs,
            validation.isValid ? cairoTimeIso : null,
            totalTokens,
            estimatedCostUsd,
            modelUsed,
            validationStatus,
            agentId,
          ]
        );
      }

      saveDatabaseToDisk();
    }

    return res.json({
      success: true,
      isSimulated: false,
      modelUsed: modelUsed,
      attempts: attempts,
      contract: finalContract,
      rawTokens: usageMetadata,
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const errMessage = error.message || 'Upstream Gemini API error';

    if (db) {
      db.run(
        `INSERT INTO api_error_logs (run_id, agent_id, error_message, timestamp) VALUES (?, ?, ?, ?);`,
        [runId, agentId, errMessage, nowIso]
      );
      saveDatabaseToDisk();
    }

    return res.status(502).json({
      success: false,
      error: `فشل استدعاء نموذج Gemini API: ${errMessage}`,
      run_id: runId,
    });
  }
});

// Fail closed: these routes previously reported unverified success.
app.post('/api/benchmarks/run', (_req, res) => res.status(503).json({ error: 'BENCHMARK_DISABLED_UNTIL_MEASURED_ASSERTIONS_EXIST' }));
app.post('/api/n8n/webhook', (_req, res) => res.status(503).json({ error: 'WEBHOOK_DISABLED_PENDING_HARDENING' }));

// Human Approval Endpoint
app.post('/api/executions/:runId/approval', approvalHandler(getDb, saveDatabaseToDisk));

function standardizeContract(
  agentId: string,
  runId: string,
  timestamp: string,
  inputs: any,
  parsedOutput: any,
  deterministicMath: any,
  validationStatus: string,
  validationErrors: string[]
) {

  return {
    agent_id: agentId,
    run_id: runId,
    timestamp: timestamp,
    timezone: 'Africa/Cairo',
    source: inputs.source || 'UNVERIFIED_INPUT',
    inputs: inputs,
    draft_revision: digest({ ...parsedOutput, ...(deterministicMath ? { deterministic_math: deterministicMath } : {}) }),
    outputs: {
      ...parsedOutput,
      ...(deterministicMath ? { deterministic_math: deterministicMath } : {}),
    },
    confidence_or_uncertainty_notes:
      parsedOutput.confidence_or_uncertainty_notes ||
      'يتطلب المصدر والمحتوى مراجعة مستقلة قبل النشر.',
    validation_status: validationStatus,
    human_approval_status: agentId === 'risk_guardian_agent' && deterministicMath && !deterministicMath.isCompliant ? 'BLOCKED_BY_RISK_RULE' : 'PENDING_HUMAN_APPROVAL',
    errors: validationErrors,
    next_action:
      agentId === 'content_creator_agent'
        ? 'AWAITING_TELEGRAM_BROADCAST_APPROVAL'
        : 'DISPATCH_TO_N8N_ORCHESTRATOR',
    version: '1.2.0',
  };
}

async function startServer() {
  await initDatabase();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(port, process.env.HOST || '127.0.0.1', () => {
    console.log(`🚀 NEXORA Hardened SQLite Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
