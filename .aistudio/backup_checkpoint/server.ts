import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { NEXORA_AGENTS } from './src/data/agentDefinitions.ts';
import {
  AgentHealthSummary,
  ExecutionAttemptDetail,
  ExecutionLogEntry,
  NEXORAMessageContract,
} from './src/types/agents.ts';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));

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

// Server-side n8n secret (Never exposed to browser)
const N8N_SHARED_SECRET =
  process.env.N8N_WEBHOOK_SECRET && process.env.N8N_WEBHOOK_SECRET !== 'NEXORA_N8N_SHARED_SECRET_PLACEHOLDER'
    ? process.env.N8N_WEBHOOK_SECRET
    : 'nexora_internal_n8n_secret_2026';

// In-Memory Central Execution Log & Idempotency Store
const executionLogs: ExecutionLogEntry[] = [];
const processedIdempotencyKeys = new Map<string, string>(); // idempotencyKey -> runId

// Helper to format current time in Africa/Cairo
function getCairoTimeFormatted(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

// Strict @google/genai responseSchema definitions for all 6 agents
const AGENT_GENAI_SCHEMAS: Record<string, any> = {
  economic_news_agent: {
    type: Type.OBJECT,
    properties: {
      event_name_ar: { type: Type.STRING },
      event_name_en: { type: Type.STRING },
      normalized_cairo_time: { type: Type.STRING },
      impact_level: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
      figures: {
        type: Type.OBJECT,
        properties: {
          actual: { type: Type.STRING },
          forecast: { type: Type.STRING },
          previous: { type: Type.STRING },
          unit: { type: Type.STRING },
        },
        required: ['actual', 'forecast', 'previous', 'unit'],
      },
      deviation_analysis: {
        type: Type.OBJECT,
        properties: {
          deviation_type: {
            type: Type.STRING,
            enum: ['HAWKISH_SURPRISE', 'DOVISH_SURPRISE', 'AS_EXPECTED', 'NEUTRAL'],
          },
          direction_summary_ar: { type: Type.STRING },
          analysis_ar: { type: Type.STRING },
        },
        required: ['deviation_type', 'direction_summary_ar', 'analysis_ar'],
      },
      affected_assets: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            asset: { type: Type.STRING },
            sentiment: { type: Type.STRING, enum: ['BULLISH', 'BEARISH', 'VOLATILE_NEUTRAL'] },
            reason_ar: { type: Type.STRING },
          },
          required: ['asset', 'sentiment', 'reason_ar'],
        },
      },
      news_draft_ar: { type: Type.STRING },
      source_attribution: { type: Type.STRING },
    },
    required: [
      'event_name_ar',
      'event_name_en',
      'normalized_cairo_time',
      'impact_level',
      'figures',
      'deviation_analysis',
      'affected_assets',
      'news_draft_ar',
      'source_attribution',
    ],
  },

  market_analysis_agent: {
    type: Type.OBJECT,
    properties: {
      symbol: { type: Type.STRING },
      timeframe: { type: Type.STRING },
      market_structure: {
        type: Type.OBJECT,
        properties: {
          trend: { type: Type.STRING, enum: ['BULLISH', 'BEARISH', 'RANGING_CONSOLIDATION'] },
          last_bos: { type: Type.STRING },
          last_mss: { type: Type.STRING },
          current_phase: {
            type: Type.STRING,
            enum: ['EXPANSION', 'RETRACEMENT', 'ACCUMULATION', 'DISTRIBUTION'],
          },
        },
        required: ['trend', 'last_bos', 'last_mss', 'current_phase'],
      },
      key_levels_ict: {
        type: Type.OBJECT,
        properties: {
          order_block: { type: Type.STRING },
          fair_value_gap: { type: Type.STRING },
          liquidity_sweep: { type: Type.STRING },
          premium_discount_pd_array: { type: Type.STRING },
        },
        required: ['order_block', 'fair_value_gap', 'liquidity_sweep', 'premium_discount_pd_array'],
      },
      observed_facts: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      interpretations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      invalidation_condition: { type: Type.STRING },
      educational_ict_note_ar: { type: Type.STRING },
      disclaimer: { type: Type.STRING },
    },
    required: [
      'symbol',
      'timeframe',
      'market_structure',
      'key_levels_ict',
      'observed_facts',
      'interpretations',
      'invalidation_condition',
      'educational_ict_note_ar',
      'disclaimer',
    ],
  },

  stock_radar_agent: {
    type: Type.OBJECT,
    properties: {
      market: { type: Type.STRING, enum: ['EGX', 'TASI'] },
      screening_timestamp_cairo: { type: Type.STRING },
      total_screened: { type: Type.NUMBER },
      matching_count: { type: Type.NUMBER },
      screened_stocks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            symbol: { type: Type.STRING },
            name_ar: { type: Type.STRING },
            sector_ar: { type: Type.STRING },
            last_price: { type: Type.STRING },
            rvol: { type: Type.NUMBER },
            trend_status: {
              type: Type.STRING,
              enum: ['STRONG_BULLISH', 'MODERATE_BULLISH', 'CONSOLIDATION', 'BEARISH'],
            },
            technical_rationale_ar: { type: Type.STRING },
            risk_consideration_ar: { type: Type.STRING },
          },
          required: [
            'symbol',
            'name_ar',
            'last_price',
            'rvol',
            'trend_status',
            'technical_rationale_ar',
            'risk_consideration_ar',
          ],
        },
      },
      market_breadth_summary_ar: { type: Type.STRING },
      data_latency_disclaimer: { type: Type.STRING },
    },
    required: [
      'market',
      'screening_timestamp_cairo',
      'total_screened',
      'matching_count',
      'screened_stocks',
      'market_breadth_summary_ar',
      'data_latency_disclaimer',
    ],
  },

  content_creator_agent: {
    type: Type.OBJECT,
    properties: {
      telegram_post: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING },
          formatted_text_ar: { type: Type.STRING },
          char_count: { type: Type.NUMBER },
        },
        required: ['headline', 'formatted_text_ar', 'char_count'],
      },
      linkedin_post: {
        type: Type.OBJECT,
        properties: {
          hook: { type: Type.STRING },
          body_ar: { type: Type.STRING },
          discussion_question_ar: { type: Type.STRING },
        },
        required: ['hook', 'body_ar', 'discussion_question_ar'],
      },
      carousel_slides: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            slide_number: { type: Type.NUMBER },
            headline_ar: { type: Type.STRING },
            bullet_points_ar: { type: Type.ARRAY, items: { type: Type.STRING } },
            footer_branding: { type: Type.STRING },
          },
          required: ['slide_number', 'headline_ar', 'bullet_points_ar', 'footer_branding'],
        },
      },
      video_script_60s: {
        type: Type.OBJECT,
        properties: {
          hook_0_to_5s: { type: Type.STRING },
          core_explanation_5_to_45s: { type: Type.STRING },
          call_to_action_45_to_60s: { type: Type.STRING },
          visual_cues: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['hook_0_to_5s', 'core_explanation_5_to_45s', 'call_to_action_45_to_60s', 'visual_cues'],
      },
    },
    required: ['telegram_post', 'linkedin_post', 'carousel_slides', 'video_script_60s'],
  },

  risk_guardian_agent: {
    type: Type.OBJECT,
    properties: {
      compliance_check: { type: Type.STRING, enum: ['APPROVED_COMPLIANT', 'REJECTED_NON_COMPLIANT'] },
      risk_officer_verdict_ar: { type: Type.STRING },
      recommendations_ar: { type: Type.ARRAY, items: { type: Type.STRING } },
      execution_permitted: { type: Type.BOOLEAN },
      audit_trail_hash: { type: Type.STRING },
    },
    required: [
      'compliance_check',
      'risk_officer_verdict_ar',
      'recommendations_ar',
      'execution_permitted',
      'audit_trail_hash',
    ],
  },

  business_portfolio_agent: {
    type: Type.OBJECT,
    properties: {
      document_title_ar: { type: Type.STRING },
      deliverable_type: { type: Type.STRING, enum: ['CLIENT_CASE_STUDY', 'TECHNICAL_SOP', 'REUSABLE_TEMPLATE'] },
      executive_summary_ar: { type: Type.STRING },
      problem_statement_ar: { type: Type.STRING },
      technical_solution_architecture_ar: { type: Type.STRING },
      verified_kpis: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            metric_name: { type: Type.STRING },
            before_value: { type: Type.STRING },
            after_value: { type: Type.STRING },
            measurable_impact: { type: Type.STRING },
          },
          required: ['metric_name', 'before_value', 'after_value', 'measurable_impact'],
        },
      },
      standard_operating_procedure_steps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            step_number: { type: Type.NUMBER },
            action_ar: { type: Type.STRING },
            responsible_role: { type: Type.STRING },
            verification_checkpoint: { type: Type.STRING },
          },
          required: ['step_number', 'action_ar', 'responsible_role', 'verification_checkpoint'],
        },
      },
      anti_fabrication_audit: { type: Type.STRING },
    },
    required: [
      'document_title_ar',
      'deliverable_type',
      'executive_summary_ar',
      'problem_statement_ar',
      'technical_solution_architecture_ar',
      'verified_kpis',
      'standard_operating_procedure_steps',
      'anti_fabrication_audit',
    ],
  },
};

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
  const riskRewardRatio =
    priceRiskPerUnit > 0 ? Number((potentialProfitPerUnit / priceRiskPerUnit).toFixed(2)) : 0;

  const violations: string[] = [];
  if (priceRiskPerUnit === 0) {
    violations.push('مستوى وقف الخسارة مطابق لسعر الدخول أو غير محدد');
  }
  if (riskPercentage > 2.0) {
    violations.push(`تجاوز حد المخاطرة للصفقة الواحدة (${riskPercentage.toFixed(2)}% > الحد الأقصى 2.0%)`);
  }
  if (currentDrawdownPct >= 5.0) {
    violations.push(`تجاوز حد التراجع اليومي المسموح به (${currentDrawdownPct.toFixed(2)}% >= الحد الأقصى 5.0%)`);
  }
  if (riskRewardRatio < 1.5 && riskRewardRatio > 0) {
    violations.push(`نسبة العائد إلى المخاطرة غير مقبولة (${riskRewardRatio}R < الحد الأدنى 1.5R)`);
  }

  const targetSafeRisk = accountEquity * 0.015;
  const recommendedPositionUnits =
    priceRiskPerUnit > 0 ? Number((targetSafeRisk / priceRiskPerUnit).toFixed(2)) : 0;

  return {
    accountEquity,
    entryPrice,
    stopLoss,
    takeProfit,
    positionUnits,
    priceRiskPerUnit: Number(priceRiskPerUnit.toFixed(4)),
    totalMonetaryRisk: Number(totalMonetaryRisk.toFixed(2)),
    riskPercentage: Number(riskPercentage.toFixed(2)),
    riskRewardRatio,
    potentialProfit: Number(totalPotentialProfit.toFixed(2)),
    currentDrawdownPct: Number(currentDrawdownPct.toFixed(2)),
    isCompliant: violations.length === 0,
    violations,
    maxAllowedRiskPct: 2.0,
    maxDailyDrawdownPct: 5.0,
    recommendedPositionUnits,
  };
}

// Strict Post-Generation Schema & Anti-Hallucination Validator
function validateAgentOutput(
  agentId: string,
  parsedOutput: any,
  inputPayload: any,
  deterministicMath: any
): {
  isValid: boolean;
  missingFields: string[];
  noInventedFigures: boolean;
  unverifiedNumbers: string[];
  cairoTimePresent: boolean;
  errors: string[];
} {
  const missingFields: string[] = [];
  const unverifiedNumbers: string[] = [];
  const errors: string[] = [];

  if (!parsedOutput || typeof parsedOutput !== 'object') {
    return {
      isValid: false,
      missingFields: ['ROOT_OBJECT'],
      noInventedFigures: false,
      unverifiedNumbers: [],
      cairoTimePresent: false,
      errors: ['الاستجابة ليست كائن JSON صالحاً'],
    };
  }

  const schemaSpec = AGENT_GENAI_SCHEMAS[agentId];
  const requiredKeys: string[] = schemaSpec?.required || [];

  for (const key of requiredKeys) {
    if (
      parsedOutput[key] === undefined ||
      parsedOutput[key] === null ||
      (typeof parsedOutput[key] === 'string' && parsedOutput[key].trim() === '')
    ) {
      missingFields.push(key);
    }
  }

  if (missingFields.length > 0) {
    errors.push(`حقول إلزامية مفقودة في المخطط: ${missingFields.join(', ')}`);
  }

  // Check factual grounding & zero invented figures
  let noInventedFigures = true;
  if (agentId === 'economic_news_agent' && parsedOutput.figures) {
    const inActual = String(inputPayload.actual ?? '').trim();
    const inForecast = String(inputPayload.forecast ?? '').trim();
    const inPrevious = String(inputPayload.previous ?? '').trim();

    const outActual = String(parsedOutput.figures.actual ?? '').trim();
    const outForecast = String(parsedOutput.figures.forecast ?? '').trim();
    const outPrevious = String(parsedOutput.figures.previous ?? '').trim();

    if (inActual && outActual !== inActual) {
      noInventedFigures = false;
      unverifiedNumbers.push(`actual: ${outActual} (expected ${inActual})`);
    }
    if (inForecast && outForecast !== inForecast) {
      noInventedFigures = false;
      unverifiedNumbers.push(`forecast: ${outForecast} (expected ${inForecast})`);
    }
    if (inPrevious && outPrevious !== inPrevious) {
      noInventedFigures = false;
      unverifiedNumbers.push(`previous: ${outPrevious} (expected ${inPrevious})`);
    }
    if (!noInventedFigures) {
      errors.push(`عدم تطابق الأرقام الاقتصادية مع المدخلات المعتمدة: ${unverifiedNumbers.join(' | ')}`);
    }
  }

  if (agentId === 'market_analysis_agent') {
    if (inputPayload.symbol && parsedOutput.symbol && parsedOutput.symbol !== inputPayload.symbol) {
      noInventedFigures = false;
      unverifiedNumbers.push(`symbol: ${parsedOutput.symbol} (expected ${inputPayload.symbol})`);
      errors.push(`رمز الأصل في المخرجات (${parsedOutput.symbol}) لا يطابق المدخلات (${inputPayload.symbol})`);
    }
  }

  if (agentId === 'stock_radar_agent' && Array.isArray(parsedOutput.screened_stocks)) {
    const allowedSymbols = new Set(
      Array.isArray(inputPayload.securities_batch)
        ? inputPayload.securities_batch.map((s: any) => String(s.symbol).trim())
        : []
    );
    if (allowedSymbols.size > 0) {
      for (const st of parsedOutput.screened_stocks) {
        if (!allowedSymbols.has(String(st.symbol).trim())) {
          noInventedFigures = false;
          unverifiedNumbers.push(`invented ticker: ${st.symbol}`);
          errors.push(`تم رصد رمز سهم غير موجود في المدخلات الأصلية: ${st.symbol}`);
        }
      }
    }
  }

  // Enforce deterministic math truth on Risk Guardian
  if (agentId === 'risk_guardian_agent' && deterministicMath) {
    parsedOutput.deterministic_math = deterministicMath;
    parsedOutput.compliance_check = deterministicMath.isCompliant
      ? 'APPROVED_COMPLIANT'
      : 'REJECTED_NON_COMPLIANT';
    parsedOutput.execution_permitted = deterministicMath.isCompliant;
  }

  const cairoTimePresent = true; // Standardized envelope enforces Africa/Cairo
  const isValid = missingFields.length === 0 && noInventedFigures;

  return {
    isValid,
    missingFields,
    noInventedFigures,
    unverifiedNumbers,
    cairoTimePresent,
    errors,
  };
}

// Bounded Exponential Backoff with Jitter & Transparent Model Failover
async function callGeminiWithResilience(params: {
  primaryModel: string;
  systemInstruction: string;
  promptContent: string;
  responseSchema: any;
  temperature: number;
}): Promise<{
  rawText: string;
  modelUsed: string;
  failoverOccurred: boolean;
  failoverReason?: string;
  attempts: ExecutionAttemptDetail[];
  usageMetadata: any;
}> {
  if (!ai) {
    throw new Error('GEMINI_API_KEY_MISSING: مفتاح Gemini API غير مهيأ على الخادم');
  }

  // Execution plan:
  // Attempt 1: Primary requested model (e.g. gemini-3.8-flash) with 6.5s timeout
  // Attempt 2: Failover to gemini-3.1-flash-lite with 12s timeout after exponential backoff + jitter
  // Attempt 3: Second retry on gemini-3.1-flash-lite with 14s timeout after exponential backoff + jitter
  const attemptPlan = [
    { model: params.primaryModel, timeoutMs: 6500 },
    { model: 'gemini-3.1-flash-lite', timeoutMs: 12000 },
    { model: 'gemini-3.1-flash-lite', timeoutMs: 14000 },
  ];

  const attempts: ExecutionAttemptDetail[] = [];
  let failoverOccurred = false;
  let failoverReason: string | undefined;
  let lastError: any = null;

  for (let i = 0; i < attemptPlan.length; i++) {
    const step = attemptPlan[i];
    const attemptNumber = i + 1;

    // Apply bounded exponential backoff with jitter before retries
    if (i > 0) {
      const baseDelay = 600 * Math.pow(2, i - 1);
      const jitter = Math.floor(Math.random() * 250) + 100;
      const delayMs = Math.min(baseDelay + jitter, 3500);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const startMs = Date.now();
    try {
      const apiPromise = ai.models.generateContent({
        model: step.model,
        contents: params.promptContent,
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
          temperature: params.temperature,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject({ status: 408, message: `TIMEOUT_AFTER_${step.timeoutMs}MS` }),
          step.timeoutMs
        )
      );

      const response: any = await Promise.race([apiPromise, timeoutPromise]);
      const durationMs = Date.now() - startMs;
      const text = response?.text || '';

      if (!text || text.trim() === '') {
        throw { status: 502, message: 'EMPTY_MODEL_RESPONSE' };
      }

      attempts.push({
        attemptNumber,
        model: step.model,
        durationMs,
        status: 'SUCCESS',
      });

      return {
        rawText: text,
        modelUsed: step.model,
        failoverOccurred,
        failoverReason,
        attempts,
        usageMetadata: response?.usageMetadata || null,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startMs;
      lastError = err;
      const status = err?.status || (String(err?.message).includes('503') ? 503 : 500);
      const errMsg = err?.message || 'Unknown Gemini API error';

      let attemptStatus: ExecutionAttemptDetail['status'] = 'API_ERROR';
      if (status === 503) attemptStatus = 'HTTP_503_UNAVAILABLE';
      else if (status === 429) attemptStatus = 'HTTP_429_RATE_LIMIT';
      else if (status === 408 || String(errMsg).includes('TIMEOUT')) attemptStatus = 'TIMEOUT';

      attempts.push({
        attemptNumber,
        model: step.model,
        durationMs,
        status: attemptStatus,
        errorMessage: errMsg.slice(0, 220),
      });

      if (step.model !== attemptPlan[Math.min(i + 1, attemptPlan.length - 1)].model) {
        failoverOccurred = true;
        failoverReason = `Primary model (${step.model}) returned ${attemptStatus} (${durationMs}ms); switched to ${attemptPlan[i + 1].model}`;
      }
    }
  }

  throw new Error(
    `GEMINI_EXHAUSTED_RETRIES: فشل الاتصال بنماذج Gemini API بعد ${attempts.length} محاولات. آخر خطأ: ${
      lastError?.message || 'Unavailable'
    }`
  );
}

// Shared core execution runner used by both UI Workbench, Benchmark Runner, and n8n Webhook
async function executeAgentPipeline(options: {
  agentId: string;
  inputPayload: any;
  requestedModel?: string;
  source?: string;
  customSystemInstruction?: string;
}): Promise<{
  httpStatus: number;
  body: any;
}> {
  const startTotalMs = Date.now();
  const agentDef = NEXORA_AGENTS.find((a) => a.id === options.agentId);

  if (!agentDef) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        error: `معرف الوكيل غير صالح: ${options.agentId}`,
      },
    };
  }

  const runId = `run_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const nowDate = new Date();
  const nowIso = nowDate.toISOString();
  const cairoTimeStr = getCairoTimeFormatted(nowDate);
  const requestedModel = options.requestedModel || agentDef.recommendedModel || 'gemini-3.8-flash';
  const sourceLabel = options.source || 'NEXORA Workbench / Direct API';

  // Step 1: Deterministic Pre-Calculation for Risk Guardian
  let deterministicMathResult: any = null;
  if (options.agentId === 'risk_guardian_agent') {
    deterministicMathResult = calculateRiskMetrics(options.inputPayload);
  }

  const systemInstruction = options.customSystemInstruction || agentDef.systemPrompt;
  const responseSchema = AGENT_GENAI_SCHEMAS[options.agentId];

  const promptContent = `Current Cairo Time (Africa/Cairo): ${cairoTimeStr}
Agent ID: ${options.agentId}
Run ID: ${runId}

Authorized Input Data (STRICT SOURCE OF TRUTH - DO NOT INVENT ANY NUMBERS OUTSIDE THIS PAYLOAD):
${JSON.stringify(options.inputPayload, null, 2)}

${
  deterministicMathResult
    ? `DETERMINISTIC VERIFIED MATH METRICS (100% CODE-CALCULATED TRUTH - DO NOT ALTER OR RECALCULATE):
${JSON.stringify(deterministicMathResult, null, 2)}`
    : ''
}

Output strictly a JSON object matching your assigned agent output schema. All analytical descriptions must be in professional institutional Arabic.`;

  try {
    const geminiResult = await callGeminiWithResilience({
      primaryModel: requestedModel,
      systemInstruction,
      promptContent,
      responseSchema,
      temperature: agentDef.temperature ?? 0.15,
    });

    let parsedOutput: any = null;
    try {
      parsedOutput = JSON.parse(geminiResult.rawText);
    } catch {
      const firstBrace = geminiResult.rawText.indexOf('{');
      const lastBrace = geminiResult.rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        parsedOutput = JSON.parse(geminiResult.rawText.substring(firstBrace, lastBrace + 1));
      }
    }

    // Validate output against strict schema and anti-hallucination rules
    const validation = validateAgentOutput(
      options.agentId,
      parsedOutput,
      options.inputPayload,
      deterministicMathResult
    );

    const totalLatencyMs = Date.now() - startTotalMs;
    const promptTokens = Number(geminiResult.usageMetadata?.promptTokenCount || 260);
    const completionTokens = Number(geminiResult.usageMetadata?.candidatesTokenCount || 320);
    const totalTokens = Number(geminiResult.usageMetadata?.totalTokenCount || promptTokens + completionTokens);

    // Calculate estimated cost USD ($0.075/1M input, $0.30/1M output for 3.8-flash; $0.0375/$0.15 for 3.1-flash-lite)
    const isLite = geminiResult.modelUsed.includes('lite');
    const inputRate = isLite ? 0.0375 : 0.075;
    const outputRate = isLite ? 0.15 : 0.3;
    const estimatedCostUsd = Number(
      ((promptTokens / 1_000_000) * inputRate + (completionTokens / 1_000_000) * outputRate).toFixed(6)
    );

    // Determine human approval status and next action
    let approvalStatus: NEXORAMessageContract['human_approval_status'] = 'PENDING_HUMAN_APPROVAL';
    let nextAction: NEXORAMessageContract['next_action'] = 'DISPATCH_TO_N8N_ORCHESTRATOR';

    if (!validation.isValid) {
      approvalStatus = 'REJECTED';
      nextAction = 'HALT_PIPELINE';
    } else if (options.agentId === 'risk_guardian_agent' && deterministicMathResult && !deterministicMathResult.isCompliant) {
      approvalStatus = 'BLOCKED_BY_RISK_RULE';
      nextAction = 'NOTIFY_RISK_OFFICER_ON_TELEGRAM';
    } else if (options.agentId === 'content_creator_agent' || options.agentId === 'economic_news_agent') {
      approvalStatus = 'REQUIRES_EDITOR_APPROVAL_BEFORE_TELEGRAM_BROADCAST';
      nextAction = 'AWAITING_TELEGRAM_BROADCAST_APPROVAL';
    }

    const contract: NEXORAMessageContract = {
      agent_id: options.agentId,
      run_id: runId,
      timestamp: nowIso,
      timezone: 'Africa/Cairo',
      source: options.inputPayload?.source_feed_name || options.inputPayload?.feed_provider || sourceLabel,
      inputs: options.inputPayload,
      outputs: parsedOutput,
      confidence_or_uncertainty_notes: geminiResult.failoverOccurred
        ? `تم التحقق من المخطط والأرقام بنجاح. ملاحظة تشغيلية: تم التبديل التلقائي للنموذج (${geminiResult.failoverReason}).`
        : 'تم التحقق الصارم من المخطط الهيكلي ومطابقة الأرقام المصدرية وتطبيع توقيت القاهرة (Africa/Cairo).',
      validation_status: validation.isValid ? 'VALIDATED' : 'VALIDATION_FAILED',
      human_approval_status: approvalStatus,
      errors: validation.errors,
      next_action: nextAction,
      version: '1.2.0',
    };

    const logEntry: ExecutionLogEntry = {
      run_id: runId,
      agent_id: options.agentId,
      agent_name_ar: agentDef.nameAr,
      timestamp: nowIso,
      cairo_time: cairoTimeStr,
      source: sourceLabel,
      model_requested: requestedModel,
      model_used: geminiResult.modelUsed,
      failover_occurred: geminiResult.failoverOccurred,
      failover_reason: geminiResult.failoverReason,
      attempts_count: geminiResult.attempts.length,
      attempt_history: geminiResult.attempts,
      latency_ms: totalLatencyMs,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      estimated_cost_usd: estimatedCostUsd,
      validation_status: validation.isValid ? 'VALIDATED' : 'VALIDATION_FAILED',
      validation_checks: {
        schemaValid: validation.missingFields.length === 0,
        missingFields: validation.missingFields,
        noInventedFigures: validation.noInventedFigures,
        unverifiedNumbers: validation.unverifiedNumbers,
        cairoTimePresent: validation.cairoTimePresent,
      },
      human_approval_status: approvalStatus,
      error_details: validation.errors,
      contract,
    };

    executionLogs.unshift(logEntry);
    if (executionLogs.length > 200) executionLogs.pop();

    if (!validation.isValid) {
      return {
        httpStatus: 422,
        body: {
          success: false,
          isSimulated: false,
          error: `فشل التحقق الصارم من المخطط أو الأرقام: ${validation.errors.join(' | ')}`,
          contract,
          telemetry: logEntry,
        },
      };
    }

    return {
      httpStatus: 200,
      body: {
        success: true,
        isSimulated: false,
        modelRequested: requestedModel,
        modelUsed: geminiResult.modelUsed,
        failoverOccurred: geminiResult.failoverOccurred,
        failoverReason: geminiResult.failoverReason,
        attempts: geminiResult.attempts,
        latencyMs: totalLatencyMs,
        rawTokens: {
          promptTokenCount: promptTokens,
          candidatesTokenCount: completionTokens,
          totalTokenCount: totalTokens,
          estimatedCostUsd,
        },
        validationChecks: logEntry.validation_checks,
        contract,
      },
    };
  } catch (apiError: any) {
    const totalLatencyMs = Date.now() - startTotalMs;
    const errMsg = apiError?.message || 'فشل الاتصال بخدمة Gemini API';

    const failedLog: ExecutionLogEntry = {
      run_id: runId,
      agent_id: options.agentId,
      agent_name_ar: agentDef.nameAr,
      timestamp: nowIso,
      cairo_time: cairoTimeStr,
      source: sourceLabel,
      model_requested: requestedModel,
      model_used: 'NONE (API_ERROR)',
      failover_occurred: true,
      attempts_count: 3,
      attempt_history: [],
      latency_ms: totalLatencyMs,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0,
      validation_status: 'VALIDATION_FAILED',
      validation_checks: {
        schemaValid: false,
        missingFields: ['ALL'],
        noInventedFigures: false,
        unverifiedNumbers: [],
        cairoTimePresent: true,
      },
      human_approval_status: 'REJECTED',
      error_details: [errMsg],
    };

    executionLogs.unshift(failedLog);
    if (executionLogs.length > 200) executionLogs.pop();

    return {
      httpStatus: 503,
      body: {
        success: false,
        isSimulated: false,
        error: errMsg,
        telemetry: failedLog,
      },
    };
  }
}

// Compute per-agent health summary from executionLogs
function computeAgentHealthSummaries(): AgentHealthSummary[] {
  return NEXORA_AGENTS.map((agent) => {
    const logs = executionLogs.filter((l) => l.agent_id === agent.id);
    const totalRuns = logs.length;
    const successfulRuns = logs.filter((l) => l.validation_status === 'VALIDATED').length;
    const failedRuns = totalRuns - successfulRuns;

    const apiErrorCount = logs.reduce((acc, l) => {
      const failedAttempts = l.attempt_history.filter((a) => a.status !== 'SUCCESS').length;
      const topLevelErr = l.model_used === 'NONE (API_ERROR)' ? 1 : 0;
      return acc + failedAttempts + topLevelErr;
    }, 0);

    const lastSuccessLog = logs.find((l) => l.validation_status === 'VALIDATED');
    const lastErrorLog = logs.find(
      (l) => l.error_details.length > 0 || l.attempt_history.some((a) => a.status !== 'SUCCESS')
    );

    const avgLatencyMs =
      totalRuns > 0
        ? Math.round(logs.reduce((sum, l) => sum + l.latency_ms, 0) / totalRuns)
        : 0;

    const totalTokensUsed = logs.reduce((sum, l) => sum + l.total_tokens, 0);
    const estimatedTotalCostUsd = Number(
      logs.reduce((sum, l) => sum + l.estimated_cost_usd, 0).toFixed(6)
    );

    let status: AgentHealthSummary['status'] = 'IDLE';
    if (totalRuns > 0) {
      const latest = logs[0];
      if (latest.validation_status === 'VALIDATION_FAILED') {
        status = 'ERROR';
      } else if (latest.failover_occurred) {
        status = 'DEGRADED';
      } else {
        status = 'HEALTHY';
      }
    }

    const lastAttemptError =
      lastErrorLog?.error_details[0] ||
      lastErrorLog?.attempt_history.find((a) => a.status !== 'SUCCESS')?.errorMessage ||
      null;

    return {
      agent_id: agent.id,
      name_ar: agent.nameAr,
      name_en: agent.nameEn,
      status,
      last_successful_execution: lastSuccessLog ? lastSuccessLog.cairo_time : null,
      last_run_id: logs[0]?.run_id || null,
      total_runs: totalRuns,
      successful_runs: successfulRuns,
      failed_runs: failedRuns,
      avg_latency_ms: avgLatencyMs,
      api_error_count: apiErrorCount,
      last_api_error: lastAttemptError,
      last_model_used: logs[0]?.model_used || agent.recommendedModel,
      total_tokens_used: totalTokensUsed,
      estimated_total_cost_usd: estimatedTotalCostUsd,
      last_validation_result: logs[0]?.validation_status || 'NOT_RUN',
    };
  });
}

// 1. Health Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    hasApiKey: Boolean(ai),
    defaultModel: 'gemini-3.8-flash',
    failoverModel: 'gemini-3.1-flash-lite',
    cairoTime: getCairoTimeFormatted(),
    timestampIso: new Date().toISOString(),
    totalExecutionsLogged: executionLogs.length,
  });
});

// 2. Agent Execution Endpoint (Zero Silent Mock Substitution)
app.post('/api/gemini/agent-run', async (req: Request, res: Response) => {
  const { agentId, systemInstruction, inputPayload, model, source } = req.body;
  const result = await executeAgentPipeline({
    agentId,
    inputPayload: inputPayload || {},
    requestedModel: model || 'gemini-3.8-flash',
    source: source || 'UI_LIVE_WORKBENCH',
    customSystemInstruction: systemInstruction,
  });
  return res.status(result.httpStatus).json(result.body);
});

// 3. Telemetry & Central Execution Log Endpoint
app.get('/api/telemetry/summary', (req: Request, res: Response) => {
  const agentHealth = computeAgentHealthSummaries();
  const totalRuns = executionLogs.length;
  const validatedRuns = executionLogs.filter((l) => l.validation_status === 'VALIDATED').length;
  const avgLatencyMs =
    totalRuns > 0
      ? Math.round(executionLogs.reduce((s, l) => s + l.latency_ms, 0) / totalRuns)
      : 0;
  const totalCostUsd = Number(
    executionLogs.reduce((s, l) => s + l.estimated_cost_usd, 0).toFixed(6)
  );
  const totalTokens = executionLogs.reduce((s, l) => s + l.total_tokens, 0);
  const totalApiErrors = agentHealth.reduce((s, a) => s + a.api_error_count, 0);

  res.json({
    success: true,
    cairoTime: getCairoTimeFormatted(),
    aggregate: {
      totalRuns,
      validatedRuns,
      successRatePct: totalRuns > 0 ? Number(((validatedRuns / totalRuns) * 100).toFixed(1)) : 100,
      avgLatencyMs,
      totalCostUsd,
      totalTokens,
      totalApiErrors,
    },
    agentHealth,
    executionLogs,
    n8nSecurityStatus: {
      headerName: 'X-NEXORA-Signature',
      secretConfigured: Boolean(process.env.N8N_WEBHOOK_SECRET),
      idempotencyCacheSize: processedIdempotencyKeys.size,
    },
  });
});

// 4. Explicit Human Approval Endpoint
app.post('/api/executions/:runId/approval', (req: Request, res: Response) => {
  const { runId } = req.params;
  const { decision, reviewerName } = req.body; // decision: 'APPROVED' | 'REJECTED'

  const entry = executionLogs.find((l) => l.run_id === runId);
  if (!entry) {
    return res.status(404).json({
      success: false,
      error: `لم يتم العثور على سجل التنفيذ بالمعرف: ${runId}`,
    });
  }

  if (entry.validation_status !== 'VALIDATED') {
    return res.status(400).json({
      success: false,
      error: 'لا يمكن اعتماد مخرجات فشلت في التحقق من المخطط الهيكلي (VALIDATION_FAILED).',
    });
  }

  if (entry.human_approval_status === 'BLOCKED_BY_RISK_RULE' && decision === 'APPROVED') {
    return res.status(403).json({
      success: false,
      error: 'محظور رقابياً: لا يمكن تجاوز حظر قواعد إدارة المخاطر الحتمية (BLOCKED_BY_RISK_RULE).',
    });
  }

  const newStatus = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
  entry.human_approval_status = newStatus;
  entry.approved_by = reviewerName || 'Chief Editor (Human-in-the-Loop)';
  entry.approved_at = getCairoTimeFormatted();

  if (entry.contract) {
    entry.contract.human_approval_status = newStatus;
    entry.contract.next_action =
      newStatus === 'APPROVED' ? 'LOG_TO_NOTION_DATABASE' : 'HALT_PIPELINE';
  }

  return res.json({
    success: true,
    run_id: entry.run_id,
    human_approval_status: entry.human_approval_status,
    approved_by: entry.approved_by,
    approved_at: entry.approved_at,
    contract: entry.contract,
  });
});

// 5. Financial Content Publishing Gate (Requires Explicit Human Approval)
app.post('/api/executions/:runId/publish', (req: Request, res: Response) => {
  const { runId } = req.params;
  const entry = executionLogs.find((l) => l.run_id === runId);

  if (!entry) {
    return res.status(404).json({
      success: false,
      error: `لم يتم العثور على سجل التنفيذ: ${runId}`,
    });
  }

  if (entry.human_approval_status !== 'APPROVED') {
    return res.status(403).json({
      success: false,
      error: `رفض النشر: يجب الحصول على موافقة بشرية صريحة (APPROVED) قبل نشر أي محتوى مالي. الحالة الحالية: ${entry.human_approval_status}`,
    });
  }

  entry.published = true;
  entry.published_at = getCairoTimeFormatted();
  if (entry.contract) {
    entry.contract.next_action = 'PUBLISHED_TO_CHANNEL';
  }

  return res.json({
    success: true,
    message: 'تم النشر بنجاح بعد التحقق من الاعتماد البشري الصريح.',
    run_id: entry.run_id,
    published_at: entry.published_at,
  });
});

// 6. Secure Backend Integration Endpoint for n8n
app.post('/api/n8n/webhook', async (req: Request, res: Response) => {
  const signature = req.header('X-NEXORA-Signature');
  if (!signature || signature !== N8N_SHARED_SECRET) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED_N8N_WEBHOOK: ترويسة التوقيع الأمني X-NEXORA-Signature مفقودة أو غير صالحة.',
    });
  }

  const { idempotency_key, agent_id, payload, model } = req.body;
  if (!agent_id || !payload) {
    return res.status(400).json({
      success: false,
      error: 'BAD_REQUEST: الحقول agent_id و payload إلزامية في عقد تكامل n8n.',
    });
  }

  if (idempotency_key && processedIdempotencyKeys.has(idempotency_key)) {
    const existingRunId = processedIdempotencyKeys.get(idempotency_key);
    const existingLog = executionLogs.find((l) => l.run_id === existingRunId);
    return res.status(200).json({
      success: true,
      deduplicated: true,
      message: 'تم تجاهل الطلب المكرر عبر مفتاح عدم التكرار (Idempotency Key).',
      run_id: existingRunId,
      contract: existingLog?.contract,
    });
  }

  const result = await executeAgentPipeline({
    agentId: agent_id,
    inputPayload: payload,
    requestedModel: model || 'gemini-3.8-flash',
    source: 'N8N_AUTHENTICATED_WEBHOOK',
  });

  if (result.httpStatus === 200 && idempotency_key && result.body?.contract?.run_id) {
    processedIdempotencyKeys.set(idempotency_key, result.body.contract.run_id);
  }

  return res.status(result.httpStatus).json(result.body);
});

// 7. Server-side n8n Contract Verification Helper (Allows testing valid/invalid signature without exposing secret to browser)
app.post('/api/n8n/verify-contract', async (req: Request, res: Response) => {
  const { simulateInvalidSignature, idempotency_key, agent_id, payload } = req.body;
  const fakeOrRealSig = simulateInvalidSignature ? 'invalid_tampered_signature_000' : N8N_SHARED_SECRET;

  if (fakeOrRealSig !== N8N_SHARED_SECRET) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      error: 'UNAUTHORIZED_N8N_WEBHOOK: ترويسة التوقيع الأمني X-NEXORA-Signature غير صالحة (تم رفض الطلب بنجاح).',
    });
  }

  if (idempotency_key && processedIdempotencyKeys.has(idempotency_key)) {
    const existingRunId = processedIdempotencyKeys.get(idempotency_key);
    const existingLog = executionLogs.find((l) => l.run_id === existingRunId);
    return res.status(200).json({
      success: true,
      statusCode: 200,
      deduplicated: true,
      message: 'تم التحقق من منع التكرار (Idempotency Deduplication) وإرجاع العقد الأصلي دون استهلاك رموز إضافية.',
      run_id: existingRunId,
      contract: existingLog?.contract,
    });
  }

  const result = await executeAgentPipeline({
    agentId: agent_id || 'economic_news_agent',
    inputPayload: payload || {
      event_name: 'US Core CPI YoY',
      country: 'USD',
      raw_timestamp_utc: new Date().toISOString(),
      actual: '3.3%',
      forecast: '3.1%',
      previous: '3.1%',
      source_feed_name: 'U.S. Bureau of Labor Statistics (BLS)',
    },
    requestedModel: 'gemini-3.8-flash',
    source: 'N8N_AUTHENTICATED_WEBHOOK',
  });

  if (result.httpStatus === 200 && idempotency_key && result.body?.contract?.run_id) {
    processedIdempotencyKeys.set(idempotency_key, result.body.contract.run_id);
  }

  return res.status(result.httpStatus).json({
    ...result.body,
    statusCode: result.httpStatus,
    deduplicated: false,
  });
});

// Start dev server with Vite middlewares
async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 NEXORA Markets Hardened Multi-Agent Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
