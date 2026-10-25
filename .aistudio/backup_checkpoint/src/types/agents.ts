export interface NEXORAMessageContract<TInputs = any, TOutputs = any> {
  agent_id:
    | 'economic_news_agent'
    | 'market_analysis_agent'
    | 'stock_radar_agent'
    | 'content_creator_agent'
    | 'risk_guardian_agent'
    | 'business_portfolio_agent'
    | string;
  run_id: string;
  timestamp: string; // ISO 8601
  timezone: 'Africa/Cairo' | string;
  source: string; // Authorized Feed Name / Endpoint / Internal DB
  inputs: TInputs;
  outputs: TOutputs;
  confidence_or_uncertainty_notes: string;
  validation_status: 'VALIDATED' | 'VALIDATION_FAILED' | 'DEGRADED_SOURCE' | 'PROVISIONAL';
  human_approval_status:
    | 'APPROVED'
    | 'REJECTED'
    | 'PENDING_HUMAN_APPROVAL'
    | 'REQUIRES_EDITOR_APPROVAL_BEFORE_TELEGRAM_BROADCAST'
    | 'BLOCKED_BY_RISK_RULE';
  errors: string[];
  next_action:
    | 'DISPATCH_TO_N8N_ORCHESTRATOR'
    | 'NOTIFY_TELEGRAM_PRIVATE_CHANNEL'
    | 'AWAITING_TELEGRAM_BROADCAST_APPROVAL'
    | 'NOTIFY_RISK_OFFICER_ON_TELEGRAM'
    | 'SUBMIT_FOR_FINAL_EXECUTION_APPROVAL'
    | 'LOG_TO_NOTION_DATABASE'
    | 'PUBLISHED_TO_CHANNEL'
    | 'HALT_PIPELINE';
  version: '1.2.0' | string;
}

export interface ExecutionAttemptDetail {
  attemptNumber: number;
  model: string;
  durationMs: number;
  status: 'SUCCESS' | 'HTTP_503_UNAVAILABLE' | 'HTTP_429_RATE_LIMIT' | 'TIMEOUT' | 'API_ERROR';
  errorMessage?: string;
}

export interface ExecutionLogEntry {
  run_id: string;
  agent_id: string;
  agent_name_ar: string;
  timestamp: string;
  cairo_time: string;
  source: string;
  model_requested: string;
  model_used: string;
  failover_occurred: boolean;
  failover_reason?: string;
  attempts_count: number;
  attempt_history: ExecutionAttemptDetail[];
  latency_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  validation_status: 'VALIDATED' | 'VALIDATION_FAILED';
  validation_checks: {
    schemaValid: boolean;
    missingFields: string[];
    noInventedFigures: boolean;
    unverifiedNumbers: string[];
    cairoTimePresent: boolean;
  };
  human_approval_status:
    | 'APPROVED'
    | 'REJECTED'
    | 'PENDING_HUMAN_APPROVAL'
    | 'REQUIRES_EDITOR_APPROVAL_BEFORE_TELEGRAM_BROADCAST'
    | 'BLOCKED_BY_RISK_RULE';
  approved_by?: string;
  approved_at?: string;
  published?: boolean;
  published_at?: string;
  error_details: string[];
  contract?: NEXORAMessageContract;
}

export interface AgentHealthSummary {
  agent_id: string;
  name_ar: string;
  name_en: string;
  status: 'HEALTHY' | 'DEGRADED' | 'ERROR' | 'IDLE';
  last_successful_execution: string | null;
  last_run_id: string | null;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  avg_latency_ms: number;
  api_error_count: number;
  last_api_error: string | null;
  last_model_used: string;
  total_tokens_used: number;
  estimated_total_cost_usd: number;
  last_validation_result: 'VALIDATED' | 'VALIDATION_FAILED' | 'NOT_RUN';
}

export interface AgentDefinition {
  id: string;
  nameAr: string;
  nameEn: string;
  badge: string;
  descriptionAr: string;
  priority: number;
  recommendedModel: 'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon';
  temperature: number;
  specificBoundaries: string[];
  requiredInputData: { field: string; type: string; required: boolean; descriptionAr: string }[];
  outputSchemaJson: any;
  toolsDefinitions: {
    name: string;
    descriptionAr: string;
    descriptionEn: string;
    parameters: any;
  }[];
  sourceValidationRules: string[];
  hallucinationPreventionRules: string[];
  errorHandlingAndRetry: {
    strategy: string;
    maxRetries: number;
    backoffFormula: string;
    fallbackBehavior: string;
  };
  tokenAndCostOptimization: {
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    approxCostPer1000RunsUSD: number;
    techniques: string[];
  };
  n8nIntegration: {
    nodeType: string;
    triggerType: string;
    telegramDestination: string;
    notionDatabase: string;
    stepExplanationAr: string;
    codeNodeSnippet: string;
  };
  systemPrompt: string;
  testCases: {
    title: string;
    input: any;
    expectedBehavior: string;
    passCriteria: string[];
  }[];
}

export interface ModelComparison {
  modelId: string;
  commonName: string;
  contextWindow: string;
  inputPricing: string;
  outputPricing: string;
  bestFitAgents: string[];
  pros: string[];
  cons: string[];
  recommendationReasonAr: string;
}
