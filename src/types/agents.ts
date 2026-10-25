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

export interface SourceValidationMetadata {
  source_name: string;
  source_identifier: string;
  event_timestamp: string;
  retrieval_timestamp: string;
  market_symbol: string;
  currency_and_units: string;
  data_freshness_minutes: number;
  data_mode: 'LIVE' | 'DELAYED' | 'HISTORICAL' | 'SIMULATED';
  source_valid: boolean;
  rejection_reason?: string;
}

export interface NumericValidationMetadata {
  sourced_values: Record<string, string | number>;
  calculated_values: Record<string, string | number>;
  units_and_precision_valid: boolean;
  no_invented_figures: boolean;
  unverified_numbers: string[];
  calculation_mismatches: string[];
}

export interface AiOutputValidationMetadata {
  schema_valid: boolean;
  missing_fields: string[];
  facts_separated_from_interpretations: boolean;
  evidence_references_present: boolean;
  flagged_unsupported_interpretations: string[];
}

export interface MultiLayerValidationReport {
  overall_valid: boolean;
  error_code: string | null;
  layer_a_source: SourceValidationMetadata;
  layer_b_numeric: NumericValidationMetadata;
  layer_c_ai_output: AiOutputValidationMetadata;
  layer_d_approval: {
    content_hash: string;
    requires_human_approval: boolean;
    approval_status: string;
    approved_content_hash?: string | null;
    content_modified_since_approval?: boolean;
  };
  layer_e_resilience: {
    model_requested: string;
    model_used: string;
    failover_occurred: boolean;
    attempts_count: number;
    zero_mock_guarantee: boolean;
  };
  errors: string[];
  warnings: string[];
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
    sourceValid?: boolean;
    factsSeparated?: boolean;
    evidencePresent?: boolean;
  };
  multi_layer_validation?: MultiLayerValidationReport;
  human_approval_status:
    | 'APPROVED'
    | 'REJECTED'
    | 'PENDING_HUMAN_APPROVAL'
    | 'REQUIRES_EDITOR_APPROVAL_BEFORE_TELEGRAM_BROADCAST'
    | 'BLOCKED_BY_RISK_RULE';
  publication_status?: 'NOT_PUBLISHED' | 'PUBLISHED' | 'BLOCKED' | 'INVALIDATED_BY_EDIT';
  content_hash?: string;
  approved_content_hash?: string | null;
  approved_by?: string;
  approved_at?: string;
  published?: boolean;
  published_at?: string;
  error_code?: string | null;
  error_details: string[];
  contract?: NEXORAMessageContract;
}

export interface ApprovalDecisionRecord {
  id: number;
  run_id: string;
  agent_id: string;
  decision: 'APPROVED' | 'REJECTED' | 'INVALIDATED_BY_EDIT';
  reviewer_name: string;
  reviewer_role: string;
  content_hash_at_decision: string;
  notes: string;
  decided_at_iso: string;
  decided_at_cairo: string;
}

export interface PublicationLogRecord {
  id: number;
  run_id: string;
  agent_id: string;
  idempotency_key: string;
  channel: string;
  approved_content_hash: string;
  publication_status: 'PUBLISHED' | 'REJECTED_DUPLICATE' | 'BLOCKED';
  published_by: string;
  published_at_iso: string;
  published_at_cairo: string;
}

export interface ApiErrorLogRecord {
  id: number;
  run_id: string;
  agent_id: string;
  attempt_number: number;
  model: string;
  error_code: string;
  http_status: number;
  error_message: string;
  latency_ms: number;
  occurred_at_iso: string;
  occurred_at_cairo: string;
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
