import { ModelComparison } from '../types/agents';

export const GEMINI_MODEL_COMPARISON: ModelComparison[] = [
  {
    modelId: 'gemini-3.8-flash',
    commonName: 'Gemini 3.8 Flash (النموذج المعتمد والأساسي لجميع الوكلاء)',
    contextWindow: '1,048,576 Tokens',
    inputPricing: 'مجاني ضمن حصة الاستخدام / أو منخفض للغاية ($0.075 / 1M tokens)',
    outputPricing: '$0.30 / 1M tokens',
    bestFitAgents: [
      'Economic News Agent',
      'Market Analysis Agent',
      'Stock Radar Agent',
      'Content Creator Agent',
      'Risk Guardian Agent (Explanations)',
      'Business & Portfolio Agent',
    ],
    pros: [
      'توازن استثنائي فائق بين السرعة العالية وجودة التفكير الاقتصادي المعمق.',
      'يدعم Structured Outputs بدقة متناهية عبر responseSchema و responseMimeType.',
      'يدعم التحكم في مستوى التفكير (Thinking Level: LOW / MEDIUM / HIGH).',
      'تكلفة شبه منعدمة تناسب مرحلة الإطلاق والتوسع المنخفض التكلفة (Low-Cost Production).',
    ],
    cons: [
      'يتطلب ضبط الـ Temperature عند قيم منخفضة (0.1 - 0.2) لتفادي أي هلوسة في الأرقام المالية.',
    ],
    recommendationReasonAr:
      'هو الخيار الذهبي لمشروع NEXORA Markets؛ حيث يحقق أعلى كفاءة سعرية مع سرعة استجابة فورية (أقل من ثانية ونصف) وقدرة فائقة على فهم المصطلحات المالية العربية والإنجليزية.',
  },
  {
    modelId: 'gemini-3.1-flash-lite',
    commonName: 'Gemini 3.1 Flash Lite',
    contextWindow: '1,048,576 Tokens',
    inputPricing: '$0.0375 / 1M tokens',
    outputPricing: '$0.15 / 1M tokens',
    bestFitAgents: ['توجيه الرسائل الأولي (Router)', 'فرز التصنيفات البسيطة في n8n'],
    pros: [
      'أسرع نموذج متاح وأقلها استهلاكاً للتكلفة على الإطلاق.',
      'توليد لحظي للنصوص المقتضبة.',
    ],
    cons: [
      'قدرات التفكير المعقد (Reasoning) محدودة مقارنة بـ 3.8 Flash.',
      'غير مناسب لتحليلات ICT/SMC الدقيقة التي تتطلب ربط مستويات القمم والقيعان.',
    ],
    recommendationReasonAr:
      'يستخدم حصراً في عقد الفرز والتوجيه السريع (Payload Triage & Intent Classification) قبل توزيع المهام على الوكلاء المتخصصين.',
  },
  {
    modelId: 'gemini-4-argon',
    commonName: 'Gemini 4 Argon (النموذج الاستدلالي المتقدم)',
    contextWindow: '1,048,576 Tokens',
    inputPricing: '$2.00 / 1M tokens (يتطلب رصيد مدفوع Pay-as-you-go)',
    outputPricing: '$8.00 / 1M tokens',
    bestFitAgents: ['دراسات الجدوى الاقتصادية الكبرى', 'الأبحاث الاستراتيجية السنوية المعقدة'],
    pros: [
      'أعلى قدرة استدلالية وتفكير رياضي وهندسي عميق في عالم نماذج الذكاء الاصطناعي.',
      'مثالي للأطروحات الاقتصادية الأكاديمية متعددة الأطراف.',
    ],
    cons: [
      'تكلفة أعلى بنحو 25 إلى 30 ضعفاً مقارنة بـ Flash.',
      'زمن استجابة أطول (Latency أعلى) نظراً لحجم التفكير الاستدلالي الداخلي.',
      'يتطلب مفتاح API مدفوع ولا يندرج ضمن الحصص المجانية.',
    ],
    recommendationReasonAr:
      'مستبعد من مسارات العمل اليومية اللحظية (n8n & Telegram) لارتفاع التكلفة وبطء الاستجابة، ويُحتفظ به فقط كأداة أبحاث يدوية استراتيجية عند الحاجة القصوى.',
  },
];

export const SHARED_CONTRACT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'NEXORAMessageContract_v1_2',
  type: 'object',
  required: [
    'agent_id',
    'run_id',
    'timestamp',
    'timezone',
    'source',
    'inputs',
    'outputs',
    'confidence_or_uncertainty_notes',
    'validation_status',
    'human_approval_status',
    'errors',
    'next_action',
    'version',
  ],
  properties: {
    agent_id: {
      type: 'string',
      enum: [
        'economic_news_agent',
        'market_analysis_agent',
        'stock_radar_agent',
        'content_creator_agent',
        'risk_guardian_agent',
        'business_portfolio_agent',
      ],
      description: 'المعرف الفريد للوكيل المنفذ للمهمة',
    },
    run_id: {
      type: 'string',
      description: 'معرف التشغيل الفريد لضمان عدم التكرار (Idempotency Key)',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'الختم الزمني للعملية بصيغة ISO 8601',
    },
    timezone: {
      type: 'string',
      const: 'Africa/Cairo',
      description: 'المنطقة الزمنية الإلزامية للنظام (توقيت القاهرة)',
    },
    source: {
      type: 'string',
      description: 'المصدر المعتمد للبيانات أو الـ Gateway المزود',
    },
    inputs: {
      type: 'object',
      description: 'البيانات المدخلة الخام الخاضعة للتدقيق',
    },
    outputs: {
      type: 'object',
      description: 'المخرجات المعالجة المهيكلة وفق المخطط المعتمد للوكيل',
    },
    confidence_or_uncertainty_notes: {
      type: 'string',
      description: 'ملاحظات الشفافية، جودة المصدر، أو أي قيود على البيانات',
    },
    validation_status: {
      type: 'string',
      enum: ['VALIDATED', 'VALIDATION_FAILED', 'DEGRADED_SOURCE', 'PROVISIONAL'],
      description: 'حالة التحقق الهندسي من صحة البيانات وعدم الهلوسة',
    },
    human_approval_status: {
      type: 'string',
      enum: [
        'APPROVED',
        'REJECTED',
        'PENDING_HUMAN_APPROVAL',
        'REQUIRES_EDITOR_APPROVAL_BEFORE_TELEGRAM_BROADCAST',
        'BLOCKED_BY_RISK_RULE',
      ],
      description: 'بوابة التدخل البشري الإلزامية (HITL Gate)',
    },
    errors: {
      type: 'array',
      items: { type: 'string' },
      description: 'قائمة بأي أخطاء أو تحذيرات واجهت خط المعالجة',
    },
    next_action: {
      type: 'string',
      enum: [
        'DISPATCH_TO_N8N_ORCHESTRATOR',
        'NOTIFY_TELEGRAM_PRIVATE_CHANNEL',
        'AWAITING_TELEGRAM_BROADCAST_APPROVAL',
        'NOTIFY_RISK_OFFICER_ON_TELEGRAM',
        'SUBMIT_FOR_FINAL_EXECUTION_APPROVAL',
        'LOG_TO_NOTION_DATABASE',
        'HALT_PIPELINE',
      ],
      description: 'الخطوة التشغيلية اللاحقة الموجهة لمحرك n8n',
    },
    version: {
      type: 'string',
      const: '1.2.0',
      description: 'إصدار العقد الموحد',
    },
  },
};

export const N8N_WORKFLOW_TEMPLATE = {
  name: 'NEXORA Markets - Master Multi-Agent Pipeline',
  nodes: [
    {
      parameters: {
        httpMethod: 'POST',
        path: 'nexora-agent-trigger',
        responseMode: 'responseNode',
      },
      name: 'Webhook Trigger (Economic & Alerts Feed)',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [100, 300],
    },
    {
      parameters: {
        jsCode: `// Cairo Timezone Normalizer & Idempotency Check
const payload = $input.first().json;
const runId = 'nex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

const cairoDate = new Intl.DateTimeFormat('ar-EG', {
  timeZone: 'Africa/Cairo',
  dateStyle: 'short',
  timeStyle: 'medium'
}).format(new Date());

return [{
  json: {
    ...payload,
    run_id: runId,
    cairo_normalized_timestamp: cairoDate,
    system_timezone: 'Africa/Cairo'
  }
}];`,
      },
      name: 'Pre-Processor & Cairo Time Normalizer',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [320, 300],
    },
    {
      parameters: {
        method: 'POST',
        url: '={{$env.NEXORA_APP_URL || "http://localhost:3000"}}/api/gemini/agent-run',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "agentId": "{{ $json.target_agent || 'economic_news_agent' }}",
  "inputPayload": {{ JSON.stringify($json) }},
  "model": "gemini-3.8-flash"
}`,
      },
      name: 'Gemini Multi-Agent Execution Node',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.1,
      position: [540, 300],
    },
    {
      parameters: {
        conditions: {
          string: [
            {
              value1: '={{ $json.contract.validation_status }}',
              value2: 'VALIDATED',
            },
          ],
        },
      },
      name: 'Validation Guard (Pass/Fail)',
      type: 'n8n-nodes-base.if',
      typeVersion: 1,
      position: [760, 300],
    },
    {
      parameters: {
        chatId: '={{$env.TELEGRAM_EDITORIAL_CHAT_ID}}',
        text: `={{ "📋 **مراجعة مسودة إخبارية جديدة (NEXORA Markets)**\\n\\n" + $json.contract.outputs.news_draft_ar + "\\n\\n⏰ التوقيت: " + $json.contract.outputs.normalized_cairo_time }}`,
        replyMarkup: 'inlineKeyboard',
        inlineKeyboard: {
          rows: [
            [
              {
                text: '✅ اعتماد ونشر في القناة العامة',
                callback_data: '=APPROVE_{{ $json.contract.run_id }}',
              },
              {
                text: '❌ رفض وحفظ كمسودة أرشيف',
                callback_data: '=REJECT_{{ $json.contract.run_id }}',
              },
            ],
          ],
        },
      },
      name: 'Telegram Human Approval Gate (Inline Keyboard)',
      type: 'n8n-nodes-base.telegram',
      typeVersion: 1.1,
      position: [1000, 220],
    },
    {
      parameters: {
        databaseId: '={{$env.NOTION_INTELLIGENCE_DB_ID}}',
        propertiesUi: {
          propertyValues: [
            {
              key: 'Run ID|title',
              title: '={{ $json.contract.run_id }}',
            },
            {
              key: 'Agent|select',
              select: '={{ $json.contract.agent_id }}',
            },
            {
              key: 'Status|status',
              status: '={{ $json.contract.validation_status }}',
            },
            {
              key: 'Approval|select',
              select: '={{ $json.contract.human_approval_status }}',
            },
          ],
        },
      },
      name: 'Notion Audit Log & Knowledge Base',
      type: 'n8n-nodes-base.notion',
      typeVersion: 2,
      position: [1000, 420],
    },
  ],
  connections: {
    'Webhook Trigger (Economic & Alerts Feed)': {
      main: [[{ node: 'Pre-Processor & Cairo Time Normalizer', type: 'main', index: 0 }]],
    },
    'Pre-Processor & Cairo Time Normalizer': {
      main: [[{ node: 'Gemini Multi-Agent Execution Node', type: 'main', index: 0 }]],
    },
    'Gemini Multi-Agent Execution Node': {
      main: [[{ node: 'Validation Guard (Pass/Fail)', type: 'main', index: 0 }]],
    },
    'Validation Guard (Pass/Fail)': {
      main: [
        [
          { node: 'Telegram Human Approval Gate (Inline Keyboard)', type: 'main', index: 0 },
          { node: 'Notion Audit Log & Knowledge Base', type: 'main', index: 0 },
        ],
      ],
    },
  },
};

export const CODEX_INTEGRATION_HANDOFF = {
  architecturePrinciples: [
    'Modular Agent Isolation: كل وكيل يمثل وحدة مستقلة في مجلد منفصل يحتوي على التعليمات والمخطط والاختبارات.',
    'Strict Typing: استخدام TypeScript حصراً لتعريف العقد وكائنات الإدخال والإخراج.',
    'Deterministic Separation: عزل العمليات الحسابية عن التوليد اللغوي منعاً لأي خطأ مالي.',
    'Human-in-the-Loop Enforced: لا يتم استدعاء واجهات النشر العام أو التنفيذ المالي برمجياً دون ترخيص بشري صريح.',
  ],
  repositoryStructure: `
nexora-multi-agent-system/
├── .env.example                       # قالب المتغيرات البيئية بدون أسرار
├── config/
│   ├── gemini.config.ts               # إعدادات @google/genai والنموذج gemini-3.8-flash
│   └── contract.schema.json           # المخطط الموحد JSON Schema v1.2
├── src/
│   ├── agents/
│   │   ├── 01_economic_news/          # وكيل الأخبار والتقويم الاقتصادي
│   │   │   ├── prompt.system.md
│   │   │   ├── schema.ts
│   │   │   └── index.ts
│   │   ├── 02_market_analysis/        # وكيل التحليل الفني ICT/SMC
│   │   │   ├── prompt.system.md
│   │   │   └── index.ts
│   │   ├── 03_stock_radar/            # وكيل رادار أسهم EGX و TASI
│   │   ├── 04_content_creator/        # وكيل صناعة المحتوى وقوالب النشر
│   │   ├── 05_risk_guardian/          # وكيل حراسة المخاطر والكود الحتمي
│   │   └── 06_business_portfolio/     # وكيل التوثيق المؤسسي ودراسات الحالة
│   ├── math/
│   │   └── deterministicRisk.ts       # محرك الحسابات المالية الحتمية
│   ├── server.ts                      # خادم Express API للوساطة والتنفيذ الآمن
│   └── tests/
│       ├── test_runner.ts             # مشغل الاختبارات الآلية
│       └── golden_datasets.json       # مجموعات البيانات الذهبية المعتمدة
└── workflows/
    ├── n8n_nexora_master.json         # مخطط n8n الجاهز للاستيراد بنقرة واحدة
    └── telegram_bot_setup.md          # دليل تهيئة بوت المراجعة التحريرية
`,
  securityChecklist: [
    'عدم تضمين مفاتيح API (Gemini API, Telegram Bot Token, Notion Secret) في الكود المصدري أو المطالبات.',
    'تخزين كافة الأسرار في لوحة متغيرات البيئة السرية المحمية (Secrets).',
    'استخدام مبدأ الصلاحيات الأدنى (Least Privilege)؛ بوت تيليجرام لا يملك صلاحيات تعديل المشرفين، ورمز Notion مقتصر على قواعد البيانات المحددة.',
    'فرض معرّف التشغيل (run_id) لمنع تكرار نشر نفس الخبر (Deduplication & Idempotency).',
    'التحقق من فاتورة وحساب Google Cloud؛ حيث أن اشتراكات المستهلكين (مثل Gemini Advanced) لا توفر أرصدة لمفاتيح المطورين للمنظومات البرمجية.',
    'التأكيد على أن Google AI Studio هو بيئة تطوير وبناء نماذج، ويجب استضافة الوكلاء المجدولين المستمرين على n8n أو خادم دائم كـ Cloud Run.',
  ],
};
