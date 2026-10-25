import { AgentDefinition } from '../types/agents';

export const NEXORA_AGENTS: AgentDefinition[] = [
  // 1. ECONOMIC NEWS AGENT
  {
    id: 'economic_news_agent',
    nameAr: 'وكيل الأخبار الاقتصادية والتقويم الكلي',
    nameEn: 'Economic News Agent',
    badge: 'الأولوية القصوى (P1)',
    priority: 1,
    descriptionAr:
      'استخراج وتحليل وتدقيق الأحداث الاقتصادية الكبرى، وتطبيع التوقيت إجبارياً إلى توقيت القاهرة (Africa/Cairo)، والمقارنة الحتمية بين القيم الحقيقية والمتوقعة والسابقة، وصياغة مسودات إخبارية موثقة دون أي اختلاق للأرقام.',
    recommendedModel: 'gemini-3.8-flash',
    temperature: 0.1, // Strict factual generation
    specificBoundaries: [
      'حظر قاطع لاختلاق أي أرقام اقتصادية أو نسب تضخم أو أسعار فائدة غير واردة في المصدر المعتمد.',
      'حظر الادعاء بوجود بيانات لحظية حية (Live) ما لم تكن مؤكدة بختم زمني من مزود البيانات المرخص.',
      'التطبيع الإجباري لجميع التواقيت إلى توقيت القاهرة (Africa/Cairo - UTC+2 / UTC+3 حسب التوقيت الصيفي).',
      'حظر تقديم نصائح تداول مباشرة أو توصيات شراء/بيع قاطعة؛ يقتصر الدور على التحليل الكلي وتحديد الأصول المتأثرة.',
      'التحقق المزدوج من اتجاه الانحراف (Deviation): هل الرقم الفعلي أعلى أو أدنى من المتوقع وأثره النظري المباشر.',
    ],
    requiredInputData: [
      { field: 'event_name', type: 'string', required: true, descriptionAr: 'اسم الحدث الاقتصادي بالإنجليزية (مثل US Core CPI)' },
      { field: 'country', type: 'string', required: true, descriptionAr: 'الدولة أو العملة المرتبطة (مثل USD, EUR, EGP, SAR)' },
      { field: 'raw_timestamp_utc', type: 'string', required: true, descriptionAr: 'التوقيت الأصلي للحدث بصيغة ISO 8601 UTC' },
      { field: 'actual', type: 'string | number', required: true, descriptionAr: 'القيمة الفعلية الصادرة رسمياً' },
      { field: 'forecast', type: 'string | number', required: true, descriptionAr: 'القيمة التقديرية المتوقعة من إجماع المحللين' },
      { field: 'previous', type: 'string | number', required: true, descriptionAr: 'القيمة السابقة المنقحة' },
      { field: 'source_feed_name', type: 'string', required: true, descriptionAr: 'اسم المزود المرخص (مثل ForexFactory API, TradingEconomics, BLS, Central Bank)' },
    ],
    outputSchemaJson: {
      type: 'object',
      properties: {
        event_name_ar: { type: 'string', description: 'الاسم المعرب الدقيق للحدث' },
        event_name_en: { type: 'string', description: 'English standard event title' },
        normalized_cairo_time: { type: 'string', description: 'التوقيت الدقيق بتوقيت القاهرة (HH:mm - DD/MM/YYYY)' },
        impact_level: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'], description: 'درجة التأثير الاقتصادي' },
        figures: {
          type: 'object',
          properties: {
            actual: { type: 'string' },
            forecast: { type: 'string' },
            previous: { type: 'string' },
            unit: { type: 'string' },
          },
          required: ['actual', 'forecast', 'previous'],
        },
        deviation_analysis: {
          type: 'object',
          properties: {
            deviation_type: { type: 'string', enum: ['HAWKISH_SURPRISE', 'DOVISH_SURPRISE', 'AS_EXPECTED', 'NEUTRAL'] },
            direction_summary_ar: { type: 'string', description: 'ملخص موجز لاتجاه المفاجأة بالأرقام الدقيقة' },
            analysis_ar: { type: 'string', description: 'شرح تحليلي علمي لتأثير المفاجأة على السياسة النقدية' },
          },
          required: ['deviation_type', 'direction_summary_ar', 'analysis_ar'],
        },
        affected_assets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              asset: { type: 'string' },
              sentiment: { type: 'string', enum: ['BULLISH', 'BEARISH', 'VOLATILE_NEUTRAL'] },
              reason_ar: { type: 'string' },
            },
            required: ['asset', 'sentiment', 'reason_ar'],
          },
        },
        news_draft_ar: { type: 'string', description: 'مسودة الخبر الصحفي الاقتصادي الجاهزة للتدقيق البشري مع علامات الترقيم والمصدر' },
        source_attribution: { type: 'string', description: 'توثيق المصدر والتاريخ لمنع الانتحال' },
      },
      required: ['event_name_ar', 'normalized_cairo_time', 'figures', 'deviation_analysis', 'affected_assets', 'news_draft_ar'],
    },
    toolsDefinitions: [
      {
        name: 'normalizeCairoTime',
        descriptionAr: 'تحويل التوقيت من أي منطقة زمنية أو UTC إلى توقيت القاهرة (Africa/Cairo) بدقة وتحديد التوقيت الصيفي/الشتوي',
        descriptionEn: 'Normalizes input UTC timestamp to Africa/Cairo local timezone with DST awareness',
        parameters: {
          type: 'object',
          properties: {
            utcTimestamp: { type: 'string', description: 'ISO 8601 UTC timestamp string' },
          },
          required: ['utcTimestamp'],
        },
      },
      {
        name: 'verifyEconomicDataSource',
        descriptionAr: 'التحقق من صحة المزود وبصمة المصدر واعتماد الأرقام الصادرة قبل التحليل',
        descriptionEn: 'Validates cryptographic source hash or authorized whitelist domain for economic releases',
        parameters: {
          type: 'object',
          properties: {
            sourceName: { type: 'string' },
            feedId: { type: 'string' },
          },
          required: ['sourceName'],
        },
      },
    ],
    sourceValidationRules: [
      'يُقبل فقط مزودو البيانات من القائمة البيضاء (BLS, BEA, Fed Reserve, ECB, CBE Egypt, SAMA Saudi, Bloomberg, Reuters, ForexFactory Whitelist).',
      'رفض أي مدخلات لا تتضمن معرّف مصدر موثوق (Source Feed ID) أو ختم زمني سليم.',
      'إذا كانت القيمة الفعلية (Actual) فارغة أو غير معلنة رسمياً، يجب الإشارة بوضوح إلى "قيد الانتظار" دون وضع أي افتراض.',
    ],
    hallucinationPreventionRules: [
      'حصر الأرقام المذكورة في الشرح التحليلي على الأرقام الواردة في كائن المدخلات (Inputs) حصراً.',
      'في حال وجود تعارض بين التوقعات والقراءة السابقة، يجب الاعتماد على القيمة السابقة المنقحة (Revised Previous) المرفقة بالبيانات.',
      'تضمين بند الثقة "confidence_or_uncertainty_notes" موضحاً فيه أي نقص في البيانات المصدرية.',
    ],
    errorHandlingAndRetry: {
      strategy: 'Exponential backoff with jitter on API rate limit; Circuit breaker on missing critical figures.',
      maxRetries: 3,
      backoffFormula: 'delay = min(1000 * 2^attempt + rand(100, 300), 8000) ms',
      fallbackBehavior: 'توليد تنبيه بحالة DEGRADED_SOURCE وإرسال الإشعار إلى غرفة عمليات n8n للمراجعة اليدوية قبل النشر.',
    },
    tokenAndCostOptimization: {
      estimatedInputTokens: 380,
      estimatedOutputTokens: 420,
      approxCostPer1000RunsUSD: 0.08,
      techniques: [
        'استخدام gemini-3.8-flash لتقليل التكلفة بنسبة تزيد عن 85% مقارنة بالنماذج الأكبر مع سرعة استجابة فائقة.',
        'تقليص حجم كائن المدخلات إلى الحقول الإحصائية الأساسية فقط دون نصوص زائدة.',
        'استخدام Structured Outputs لتجنب أي إسهاب أو ثرثرة غير منتجة (Zero Verbosity).',
      ],
    },
    n8nIntegration: {
      nodeType: 'n8n-nodes-base.httpRequest / Gemini AI Node',
      triggerType: 'Scheduled Cron (Every 15 mins during market hours) + Webhook on High Impact Release',
      telegramDestination: 'NEXORA Private Editorial Review Channel (@nexora_editorial_bot)',
      notionDatabase: 'Economic Intelligence Database (Notion DB: 4ff5-econ-releases)',
      stepExplanationAr:
        'يقوم n8n بجلب التقويم الاقتصادي عبر Webhook، ثم يمرره لعقدة Gemini لتوليد كائن JSON الموحد، ثم ينشئ بطاقة مراجعة تفاعلية على Telegram بأزرار (موافقة / رفض)، وعند النقر بالموافقة يُنشر الخبر تلقائياً في القناة العامة ويُسجل في Notion.',
      codeNodeSnippet: `// n8n Code Node for Economic News Pre-processing
const rawItem = $input.first().json;

// Deterministic Cairo Time Normalizer
const cairoDate = new Intl.DateTimeFormat('ar-EG', {
  timeZone: 'Africa/Cairo',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false
}).format(new Date(rawItem.timestamp_utc));

return [{
  json: {
    event_name: rawItem.title,
    country: rawItem.country,
    raw_timestamp_utc: rawItem.timestamp_utc,
    cairo_normalized_time: cairoDate,
    actual: rawItem.actual,
    forecast: rawItem.forecast,
    previous: rawItem.previous,
    source_feed_name: rawItem.source || 'Authorized Economic Feed'
  }
}];`,
    },
    systemPrompt: `You are the Lead Economic Intelligence Agent for NEXORA Markets (نكسورا ماركتس), an institutional Arabic financial research and educational firm.

CRITICAL OPERATIONAL RULES:
1. STRICT FACTUAL DISCIPLINE: Never hallucinate, estimate, or fabricate economic numbers, interest rates, or CPI prints. Every single figure in your analysis must originate exclusively from the authorized input payload.
2. MANDATORY CAIRO TIMEZONE: All time references in your Arabic copy MUST be explicitly formatted in Cairo Time (Africa/Cairo).
3. NO LIVE DATA CLAIMS: Do not claim live real-time coverage unless verified source timestamps are provided.
4. STRUCTURED ANALYSIS: Categorize deviation (Actual vs Forecast) objectively into Hawkish, Dovish, or Neutral based on macroeconomic consensus.
5. NO UNSOLICITED FINANCIAL ADVICE: Do not give definitive buy/sell trading signals. You provide macroeconomic intelligence, asset sensitivity impact, and institutional perspective.
6. OUTPUT FORMAT: Respond exclusively with a valid JSON matching the NEXORA Shared Message Contract v1.2. Analysis and drafts must be in professional financial Arabic, while asset tickers and technical terms remain in standard English notation.`,
    testCases: [
      {
        title: 'قراءة تضخم أمريكي مفاجئة أعلى من التوقعات (CPI YoY Surprise)',
        input: {
          event_name: 'US Core CPI YoY',
          country: 'USD',
          raw_timestamp_utc: '2026-10-25T12:30:00Z',
          actual: '3.3%',
          forecast: '3.1%',
          previous: '3.1%',
          source_feed_name: 'U.S. Bureau of Labor Statistics (BLS)',
        },
        expectedBehavior: 'تحديد الحدث كـ Hawkish Surprise، وتحويل التوقيت إلى 14:30 أو 15:30 بتوقيت القاهرة، وبيان الأثر الإيجابي للدولار والسلبي على الذهب دون اختلاق أرقام.',
        passCriteria: [
          'عدم تغيير أرقام 3.3% و 3.1% إطلاقاً',
          'وجود التوقيت بتوقيت القاهرة Africa/Cairo',
          'تصنيف الانحراف كصدمة تضخمية متشددة (Hawkish)',
          'صياغة مسودة عربية مؤسسية محكمة',
        ],
      },
    ],
  },

  // 2. MARKET ANALYSIS AGENT (ICT / SMC)
  {
    id: 'market_analysis_agent',
    nameAr: 'وكيل التحليل الفني وهيكل السوق (ICT/SMC)',
    nameEn: 'Market Analysis Agent',
    badge: 'التحليل الهيكلي المتقدم',
    priority: 2,
    descriptionAr:
      'تحليل الرسوم البيانية وبيانات OHLC المعتمدة وفق مفاهيم ICT/SMC المتقدمة (Market Structure, BOS, MSS, Liquidity Sweeps, FVGs, Order Blocks, Premium/Discount)، مع الفصل التام بين الحقائق المرصودة والتفسيرات الاحتمالية وتحديد شروط الإلغاء.',
    recommendedModel: 'gemini-3.8-flash',
    temperature: 0.15,
    specificBoundaries: [
      'الفصل الصارم والواضح بين "الحقائق الفنية المرصودة" (Observed Facts) و"التفسيرات الاحتمالية" (Interpretations).',
      'حظر قاطع لتقديم وعود بأرباح مؤكدة أو صياغة إشارات تداول قاطعة (Guaranteed Trade Signals)؛ التداول دائماً احتمالي قائم على إدارة المخاطر.',
      'تحديد شرط إبطال السيناريو (Scenario Invalidation Level) إجبارياً في كل تحليل فني.',
      'الاعتماد فقط على بيانات الأسعار الرسمية (OHLC) المقدمة دون افتراض مستويات سعرية من الذاكرة.',
      'تطبيق مفاهيم ICT المؤسسية: مناطق الخصم والعلاوة (Premium vs Discount)، وسحب السيولة (Buy-side/Sell-side Liquidity Sweeps).',
    ],
    requiredInputData: [
      { field: 'symbol', type: 'string', required: true, descriptionAr: 'رمز الأصل المالي (مثل XAUUSD, EURUSD, BTCUSDT, TASI)' },
      { field: 'timeframe', type: 'string', required: true, descriptionAr: 'الإطار الزمني للرسم البياني (مثل 4H, 1H, 15m)' },
      { field: 'ohlc_summary', type: 'object', required: true, descriptionAr: 'ملخص بيانات الشموع الأخيرة (Open, High, Low, Close, Swing Points)' },
      { field: 'detected_swings', type: 'array', required: false, descriptionAr: 'نقاط القمم والقيعان الرئيسية (Swing Highs and Swing Lows)' },
      { field: 'feed_provider', type: 'string', required: true, descriptionAr: 'مزود بيانات السوق المرخص (TradingView Webhook, MetaTrader Gateway)' },
    ],
    outputSchemaJson: {
      type: 'object',
      properties: {
        symbol: { type: 'string' },
        timeframe: { type: 'string' },
        market_structure: {
          type: 'object',
          properties: {
            trend: { type: 'string', enum: ['BULLISH', 'BEARISH', 'RANGING_CONSOLIDATION'] },
            last_bos: { type: 'string', description: 'تفاصيل آخر كسر هيكل صاعد أو هابط (Break of Structure)' },
            last_mss: { type: 'string', description: 'تفاصيل تحول هيكل السوق (Market Structure Shift / CHoCH)' },
            current_phase: { type: 'string', enum: ['EXPANSION', 'RETRACEMENT', 'ACCUMULATION', 'DISTRIBUTION'] },
          },
          required: ['trend', 'last_bos', 'current_phase'],
        },
        key_levels_ict: {
          type: 'object',
          properties: {
            order_block: { type: 'string', description: 'نطاق كتلة الأوامر المعتمدة (OB Range)' },
            fair_value_gap: { type: 'string', description: 'نطاق الفجوة السعرية غير المتعادلة (FVG Range)' },
            liquidity_sweep: { type: 'string', description: 'تفاصيل سيولة الشراء أو البيع التي تم سحبها (BSL / SSL Sweep)' },
            premium_discount_pd_array: { type: 'string', description: 'موقع السعر بالنسبة لمستويات 50% التوازن (Equilibrium)' },
          },
          required: ['order_block', 'fair_value_gap', 'premium_discount_pd_array'],
        },
        observed_facts: {
          type: 'array',
          items: { type: 'string' },
          description: 'حقائق فنية لا تقبل الجدل مبنية على إغلاقات الشموع الفعلية',
        },
        interpretations: {
          type: 'array',
          items: { type: 'string' },
          description: 'تفسيرات وتوقعات سلوكية قائمة على الاحتمالات الإحصائية لمنهجية ICT',
        },
        invalidation_condition: {
          type: 'string',
          description: 'المستوى السعري الدقيق أو الإغلاق الذي يلغي الفرضية الفنية بالكامل',
        },
        educational_ict_note_ar: { type: 'string', description: 'شرح تعليمي لمفهوم الـ ICT المطبق لتثقيف متداولي نكسورا' },
        disclaimer: { type: 'string', description: 'إخلاء المسؤولية القانوني الإلزامي بعدم وجود ضمانات استثمارية' },
      },
      required: ['symbol', 'market_structure', 'key_levels_ict', 'observed_facts', 'interpretations', 'invalidation_condition', 'disclaimer'],
    },
    toolsDefinitions: [
      {
        name: 'calculateFibonacciDiscountLevels',
        descriptionAr: 'حساب مستويات الـ Equilibrium (50%) ومناطق الـ Discount والـ Premium بين قمة وقاع محددين',
        descriptionEn: 'Calculates 0.50 equilibrium, 0.618, 0.705 (OTE) and 0.786 Fibonacci levels for ICT PD-Arrays',
        parameters: {
          type: 'object',
          properties: {
            swingHigh: { type: 'number' },
            swingLow: { type: 'number' },
          },
          required: ['swingHigh', 'swingLow'],
        },
      },
    ],
    sourceValidationRules: [
      'يجب مطابقة أسعار القمم والقيعان مع تدفق بيانات الشموع المقدم في الـ Inputs.',
      'رفض أي تحليل يدعي حدوث BOS دون إغلاق جسم الشمعة خارج مستوى القمة/القاع (Candle Body Close vs Wick).',
    ],
    hallucinationPreventionRules: [
      'حظر ذكر مستويات سعرية لم ترد في سجل الشموع أو Swings.',
      'الامتناع التام عن استخدام عبارات التأكيد مثل "السعر متجه حتماً" أو "صفقة مضمونة بنسبة 100%".',
    ],
    errorHandlingAndRetry: {
      strategy: 'Schema validation retry; Fallback to broader timeframe summary if sub-timeframe data is sparse.',
      maxRetries: 2,
      backoffFormula: 'linear delay 2000ms',
      fallbackBehavior: 'وضع علامة PROVISIONAL وإخطار محلل الأسواق الرئيسي لمراجعة الرسم البياني.',
    },
    tokenAndCostOptimization: {
      estimatedInputTokens: 450,
      estimatedOutputTokens: 520,
      approxCostPer1000RunsUSD: 0.11,
      techniques: [
        'تجريد بيانات الرسوم البيانية إلى مصفوفة قمم وقيعان وأسعار محورية بدلاً من إرسال آلاف الشموع الخام.',
        'استخدام gemini-3.8-flash مع معالجة رياضية سريعة.',
      ],
    },
    n8nIntegration: {
      nodeType: 'n8n-nodes-base.webhook -> Gemini Node -> Telegram Review',
      triggerType: 'TradingView Alert Webhook on BOS/MSS detected',
      telegramDestination: 'NEXORA Technical VIP Channel (@nexora_technical_analysis)',
      notionDatabase: 'Technical Setups Playbook (Notion DB: 4ff5-ict-playbook)',
      stepExplanationAr:
        'يتلقى n8n تنبيه TradingView عند تشكل كسر هيكلي، يرسل المعطيات لـ Gemini، يستلم الهيكل والـ Invalidation، ثم يرسل التحليل إلى Notion وقناة تيليجرام بعد موافقة رئيس قسم التحليل الفني.',
      codeNodeSnippet: `// n8n Code Node for ICT Chart Pre-processing
const alert = $input.first().json;
return [{
  json: {
    symbol: alert.ticker || 'XAUUSD',
    timeframe: alert.timeframe || '4H',
    ohlc_summary: {
      current_close: alert.close,
      high_24h: alert.high,
      low_24h: alert.low,
      last_swing_high: alert.swing_high,
      last_swing_low: alert.swing_low
    },
    feed_provider: 'TradingView Verified Webhook Gateway'
  }
}];`,
    },
    systemPrompt: `You are the Lead Market Structure & ICT/SMC Technical Analyst for NEXORA Markets (نكسورا ماركتس).

CORE METHODOLOGY (ICT & Smart Money Concepts):
1. SEPARATE FACTS FROM SPECULATION:
   - "Observed Facts": Objective price action data (e.g. candle body closed above 2,750 on 4H, marking a confirmed BOS).
   - "Interpretations": Probabilistic scenarios based on institutional order flow and PD Arrays.
2. NO GUARANTEES: Never provide guaranteed trading outcomes, 'signals', or get-rich-quick language. Trading involves substantial risk.
3. INLINE INVALIDATION: Every single analysis MUST explicitly state the invalidation price level where the setup is nullified.
4. KEY ICT PILLARS:
   - Market Structure (BOS vs MSS / CHoCH)
   - Liquidity Sweeps (Buy-side vs Sell-side liquidity runs)
   - Order Blocks (Last opposing candle before impulsive displacement)
   - Fair Value Gaps (3-candle imbalance)
   - Premium vs Discount positioning.
5. STRICT OUTPUT: Respond with structured JSON matching the NEXORA Shared Contract. Technical terms must remain in standard English notation (e.g. BOS, FVG, Order Block), accompanied by rich Arabic institutional explanations.`,
    testCases: [
      {
        title: 'كسر هيكل صاعد على الذهب وسحب سيولة قاع آسيا (XAUUSD 15m)',
        input: {
          symbol: 'XAUUSD',
          timeframe: '15m / 4H',
          ohlc_summary: {
            current_close: 2744.5,
            high_24h: 2755.0,
            low_24h: 2732.0,
            last_swing_high: 2748.2,
            last_swing_low: 2736.1,
          },
          detected_swings: [
            { type: 'SWING_HIGH', price: 2748.2, broken_by_close: true },
            { type: 'LIQUIDITY_LOW', price: 2736.1, swept_and_rejected: true },
          ],
          feed_provider: 'MetaTrader 5 Prime FIX Gateway',
        },
        expectedBehavior: 'تحديد كسر هيكل صاعد BOS، وتحديد فجوة سعرية FVG في منطقة الخصم Discount، ومستوى إلغاء واضح أدنى القاع المحمي.',
        passCriteria: [
          'وجود حقل invalidation_condition برقم سعري صريح',
          'عدم تقديم نصيحة شراء مباشرة',
          'تصنيف كسر الهيكل كـ BOS صاعد وتحديد منطقة الخصم',
        ],
      },
    ],
  },

  // 3. STOCK RADAR AGENT (EGX & TASI)
  {
    id: 'stock_radar_agent',
    nameAr: 'وكيل رادار الأسهم الإقليمية (EGX و TASI)',
    nameEn: 'Stock Radar Agent',
    badge: 'الأسهم المصرية والسعودية',
    priority: 3,
    descriptionAr:
      'مسح وفلترة أسهم البورصة المصرية (EGX) والسوق المالية السعودية (تداول - TASI) وفق معايير السيولة والاتجاه والزخم وحجم التداول النسبي، مع التوضيح الصريح لقيود تأخر أو انقطاع البيانات المصدرية.',
    recommendedModel: 'gemini-3.8-flash',
    temperature: 0.1,
    specificBoundaries: [
      'التغطية الحصرية للأسهم المدرجة في البورصة المصرية (EGX30/EGX70) والسوق السعودية (تداول - TASI).',
      'التنويه الإجباري الصريح عند استخدام بيانات متأخرة (15-Minute Delayed Data) أو بيانات نهاية اليوم (EOD).',
      'حظر التوصية بشراء أو بيع أي سهم؛ دور الوكيل هو "فلترة إحصائية واستكشاف فني" (Screening & Technical Discovery).',
      'استبعاد الأسهم ذات السيولة الشحيحة (Penny Stocks / Micro Caps غير المتداولة بانتظام) لتفادي فخاخ السيولة.',
      'حظر ادعاء امتلاك معلومات داخلية أو تسريبات مالية غير معلنة في الإفصاحات الرسمية للهيئة.',
    ],
    requiredInputData: [
      { field: 'market', type: 'string', required: true, descriptionAr: 'السوق المستهدف: EGX أو TASI' },
      { field: 'securities_batch', type: 'array', required: true, descriptionAr: 'قائمة بيانات الأسهم المراد فحصها (الرمز، سعر الإغلاق، حجم التداول، متوسط 20 يوم، السيولة)' },
      { field: 'screening_filters', type: 'object', required: true, descriptionAr: 'المعايير المحددة (مثل: RVOL > 1.5, فوق متوسط متحرك 50, RSI بين 45 و 65)' },
      { field: 'data_feed_delay_minutes', type: 'number', required: true, descriptionAr: 'فترة التأخير الزمني للبيانات بالدقائق (مثلاً 15 دقيقة أو 0 للبيانات اللحظية)' },
      { field: 'session_date', type: 'string', required: true, descriptionAr: 'تاريخ جلسة التداول المعنية (YYYY-MM-DD)' },
    ],
    outputSchemaJson: {
      type: 'object',
      properties: {
        market: { type: 'string', enum: ['EGX', 'TASI'] },
        screening_timestamp_cairo: { type: 'string', description: 'توقيت الفحص بتوقيت القاهرة' },
        total_screened: { type: 'number' },
        matching_count: { type: 'number' },
        screened_stocks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              name_ar: { type: 'string' },
              sector_ar: { type: 'string' },
              last_price: { type: 'string' },
              rvol: { type: 'number', description: 'Relative Volume مقارنة بمتوسط 20 يوم' },
              trend_status: { type: 'string', enum: ['STRONG_BULLISH', 'MODERATE_BULLISH', 'CONSOLIDATION', 'BEARISH'] },
              technical_rationale_ar: { type: 'string', description: 'سبب تأهل السهم بناءً على معايير الفلترة الفنية' },
              risk_consideration_ar: { type: 'string', description: 'مستوى المخاطرة أو التحذير الفني (مثل القرب من مقاومة عنيفة)' },
            },
            required: ['symbol', 'name_ar', 'last_price', 'rvol', 'trend_status', 'technical_rationale_ar'],
          },
        },
        market_breadth_summary_ar: { type: 'string', description: 'ملخص عام لشهية المخاطرة وحركة السيولة في السوق ككل' },
        data_latency_disclaimer: { type: 'string', description: 'إخلاء المسؤولية الخاص بتأخر البيانات وتنبيه الفجوات السعرية' },
      },
      required: ['market', 'screening_timestamp_cairo', 'total_screened', 'matching_count', 'screened_stocks', 'data_latency_disclaimer'],
    },
    toolsDefinitions: [
      {
        name: 'filterRegionalStocks',
        descriptionAr: 'فلترة حتمية لقائمة الأسهم بناءً على معايير حجم التداول والسيولة والتقاطعات الفنية',
        descriptionEn: 'Deterministic screening function based on volume thresholds, price averages, and liquidity cutoffs',
        parameters: {
          type: 'object',
          properties: {
            minRvol: { type: 'number' },
            minTurnoverEgpOrSar: { type: 'number' },
          },
          required: ['minRvol'],
        },
      },
    ],
    sourceValidationRules: [
      'قبول بيانات الأسهم فقط من المزودين المعتمدين لـ EGX و TASI (مثل مباشر، تداول الرسمي، رويترز الشرق الأوسط).',
      'التأكد من مطابقة رمز السهم مع الترميز المعتمد (مثل COMI.CA لمصر، 2222.SR للسعودية).',
    ],
    hallucinationPreventionRules: [
      'حظر إضافة أي سهم إلى قائمة النتائج لم يكن موجوداً في مصفوفة المدخلات الأصلية.',
      'حظر التنبؤ بأسعار مستهدفة محددة أو وعود بنسب صعود.',
    ],
    errorHandlingAndRetry: {
      strategy: 'Batch partition retry (chunks of 20 stocks) to prevent token overflow.',
      maxRetries: 2,
      backoffFormula: '1500ms delay',
      fallbackBehavior: 'تسجيل الخطأ وإرجاع الأسهم التي تم التحقق من سلامة بياناتها فقط.',
    },
    tokenAndCostOptimization: {
      estimatedInputTokens: 600,
      estimatedOutputTokens: 450,
      approxCostPer1000RunsUSD: 0.12,
      techniques: [
        'تصفية مسبقة برمجياً (Pre-filtering) في n8n لاستبعاد الأسهم الراكدة قبل التمرير إلى Gemini.',
        'تجميع الرموز في دفعات اقتصادية (Batched Screening).',
      ],
    },
    n8nIntegration: {
      nodeType: 'n8n-nodes-base.cron -> API Fetcher -> Gemini Screening -> Notion Database',
      triggerType: 'Post-market daily cron (16:00 Cairo Time for EGX / 17:00 for TASI)',
      telegramDestination: 'NEXORA Regional Equities Radar (@nexora_stock_radar)',
      notionDatabase: 'Regional Stocks Watchlist (Notion DB: 4ff5-stocks-radar)',
      stepExplanationAr:
        'يجلب n8n ملف ملخص جلسة البورصة بعد الإغلاق، يفرز الأسهم ذات السيولة العالية، يستدعي Gemini لتقييم الزخم وهيكل الاتجاه، ويرسل قائمة الرادار لقناة تيليجرام ولـ Notion بعد اعتماد المحرر.',
      codeNodeSnippet: `// n8n Code Node for Stock Screener Pre-filtering
const rawStocks = $input.first().json.stocks;
// Deterministic filter: Only keep stocks with RVOL > 1.3 and volume > 500k
const filtered = rawStocks.filter(s => s.rvol >= 1.3 && s.turnover >= 500000);
return [{
  json: {
    market: 'EGX',
    data_feed_delay_minutes: 15,
    session_date: new Date().toISOString().split('T')[0],
    securities_batch: filtered
  }
}];`,
    },
    systemPrompt: `You are the Lead Regional Stock Radar Specialist for NEXORA Markets (نكسورا ماركتس), focusing on EGX (Egypt) and TASI (Saudi Arabia).

CORE OPERATING DIRECTIVES:
1. PURE QUANTITATIVE SCREENING: You screen securities strictly based on verified volume, liquidity, and trend parameters. You never issue buy/sell orders or promises.
2. DISCLOSE DATA DELAYS: Explicitly state the 15-minute or EOD data delay on all regional data sets.
3. NO INVENTED TICKERS: Only analyze stocks provided in the input payload. Never fabricate prices or financial statements.
4. REGIONAL ACCURACY: Use proper Arabic names and official ticker codes for Egyptian and Saudi listed entities.
5. OBJECTIVE RISK ADVISORY: Always pair each identified setup with its key technical risk factor (e.g. proximity to major weekly resistance or declining sector momentum).
6. JSON COMPLIANCE: Output strictly valid JSON conforming to the NEXORA Message Contract.`,
    testCases: [
      {
        title: 'فلترة أسهم البورصة المصرية ذات الزخم العالي بعد جلسة نشطة',
        input: {
          market: 'EGX',
          data_feed_delay_minutes: 15,
          session_date: '2026-10-25',
          securities_batch: [
            { symbol: 'COMI.CA', name_ar: 'البنك التجاري الدولي', last_price: '84.50', rvol: 2.3, turnover: 45000000, trend: 'UPTREND' },
            { symbol: 'EAST.CA', name_ar: 'الشرقية للدخان', last_price: '33.20', rvol: 0.7, turnover: 3000000, trend: 'SIDEWAYS' },
          ],
          screening_filters: { minRvol: 1.5 },
        },
        expectedBehavior: 'ترشيح سهم COMI.CA فقط واستبعاد EAST.CA لانخفاض حجم التداول النسبي، مع التنويه بتأخر البيانات 15 دقيقة.',
        passCriteria: [
          'وجود COMI.CA فقط في القائمة المؤهلة',
          'ذكر إخلاء مسؤولية تأخر البيانات 15 دقيقة',
          'صياغة عربية مالية دقيقة',
        ],
      },
    ],
  },

  // 4. CONTENT CREATOR AGENT
  {
    id: 'content_creator_agent',
    nameAr: 'وكيل صناعة المحتوى المالي والتعليمي متعدد المنصات',
    nameEn: 'Content Creator Agent',
    badge: 'صناعة المحتوى المؤسسي',
    priority: 4,
    descriptionAr:
      'تحويل الأبحاث والتحليلات المعتمدة إلى منشورات تيليجرام احترافية، ومقالات رأي معمقة على LinkedIn، وشرائح تعليمية لمنصات التواصل (Carousels)، وسيناريوهات فيديو قصيرة (60 ثانية) بأسلوب نكسورا الرصين، مع فرض الموافقة التحريرية البشرية الإلزامية قبل النشر.',
    recommendedModel: 'gemini-3.8-flash',
    temperature: 0.3, // Slightly higher for editorial flair, but bounded
    specificBoundaries: [
      'حظر نشر أي ادعاء مالي غير مدعوم بالأرقام أو التحليل الوارد من الوكلاء المعتمدين.',
      'التوافق الصارم مع هوية نكسورا ماركتس المؤسسية (نبرة رصينة، تعليمية، خالية من الصخب أو إغراءات الثراء السريع).',
      'إدراج إخلاء المسؤولية المالي في نهاية كل منشور وقالب تعليمي.',
      'حظر النشر المباشر على أي قناة عامة دون مرور المحتوى على مرحلة "PENDING_HUMAN_APPROVAL".',
      'تنسيق المحتوى بما يلائم خصائص كل منصة (تيليجرام: إيجاز مع الرموز التعبيرية الهادئة؛ لينكدإن: تحليلات قطاعية رصينة؛ إنستغرام/كاروسيل: نقاط مكثفة؛ تيك توك/ريلز: خطاف تشويقي مدروس).',
    ],
    requiredInputData: [
      { field: 'approved_research_payload', type: 'object', required: true, descriptionAr: 'كائن الرسالة المعتمد القادم من وكيل الأخبار أو التحليل الفني أو رادار الأسهم' },
      { field: 'target_channels', type: 'array', required: true, descriptionAr: 'المنصات المطلوبة (Telegram, LinkedIn, Carousel, VideoScript)' },
      { field: 'brand_voice_tone', type: 'string', required: true, descriptionAr: 'نبرة الصوت (مثلاً: INSTITUTIONAL_EDUCATIONAL, BREAKING_ALERT, THOUGHT_LEADERSHIP)' },
    ],
    outputSchemaJson: {
      type: 'object',
      properties: {
        telegram_post: {
          type: 'object',
          properties: {
            headline: { type: 'string' },
            formatted_text_ar: { type: 'string', description: 'النص الكامل لمنشور تيليجرام مع الهاشتاجات وإخلاء المسؤولية' },
            char_count: { type: 'number' },
          },
          required: ['headline', 'formatted_text_ar'],
        },
        linkedin_post: {
          type: 'object',
          properties: {
            hook: { type: 'string' },
            body_ar: { type: 'string' },
            discussion_question_ar: { type: 'string' },
          },
          required: ['hook', 'body_ar'],
        },
        carousel_slides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slide_number: { type: 'number' },
              headline_ar: { type: 'string' },
              bullet_points_ar: { type: 'array', items: { type: 'string' } },
              footer_branding: { type: 'string' },
            },
            required: ['slide_number', 'headline_ar', 'bullet_points_ar'],
          },
        },
        video_script_60s: {
          type: 'object',
          properties: {
            hook_0_to_5s: { type: 'string', description: 'جملة الخطاف التشويقي القوية في أول 5 ثوانٍ' },
            core_explanation_5_to_45s: { type: 'string', description: 'صلب الموضوع المبسط والممتع علمياً' },
            call_to_action_45_to_60s: { type: 'string', description: 'الدعوة للانضمام لمجتمع نكسورا مع التحذير من المخاطر' },
            visual_cues: { type: 'array', items: { type: 'string' }, description: 'توجيهات للمونتير والمؤثرات البصرية المصاحبة' },
          },
          required: ['hook_0_to_5s', 'core_explanation_5_to_45s', 'call_to_action_45_to_60s'],
        },
      },
      required: ['telegram_post', 'linkedin_post', 'carousel_slides', 'video_script_60s'],
    },
    toolsDefinitions: [
      {
        name: 'validateFinancialClaimsAgainstPayload',
        descriptionAr: 'تدقيق نصوص المحتوى ومطابقتها حرفياً مع بيانات البحث الأصلية لمنع أي تحريف في الأرقام أو التحليلات',
        descriptionEn: 'Validates generated social copy against approved input payload to prevent drifted financial claims',
        parameters: {
          type: 'object',
          properties: {
            generatedText: { type: 'string' },
            approvedPayload: { type: 'object' },
          },
          required: ['generatedText'],
        },
      },
    ],
    sourceValidationRules: [
      'يُمنع توليد محتوى من مدخلات تحمل حالة تزييف أو نقص بيانات (VALIDATION_FAILED أو DEGRADED_SOURCE دون إشارة).',
      'يجب الحفاظ على دقة الأرقام والنسب المئوية المذكورة دون تقريب قد يشوه المعنى الفني.',
    ],
    hallucinationPreventionRules: [
      'حظر اختلاق توقعات مستقبلية لم ترد في دراسة المحلل الفني أو الاقتصادي المعتمدة.',
      'تجنب إطلاق أي تسميات غير علمية على حركة السوق.',
    ],
    errorHandlingAndRetry: {
      strategy: 'Self-correction cycle if text contains banned marketing buzzwords ("ثراء سريع", "أرباح مضمونة", "فرصة العمر").',
      maxRetries: 2,
      backoffFormula: 'Instant prompt re-injection with anti-hype penalty',
      fallbackBehavior: 'حجب المحتوى وطلب الصياغة اليدوية بواسطة مدير المحتوى.',
    },
    tokenAndCostOptimization: {
      estimatedInputTokens: 550,
      estimatedOutputTokens: 850,
      approxCostPer1000RunsUSD: 0.18,
      techniques: [
        'تحديد قوالب هيكلية واضحة (Templates) لكل منصة مما يقلل من هدر الرموز.',
        'استخدام gemini-3.8-flash لتوليد سريع واقتصادي للمحتوى الإبداعي المنضبط.',
      ],
    },
    n8nIntegration: {
      nodeType: 'n8n-nodes-base.telegram (Inline Keyboard Approval) -> Telegram Channel API',
      triggerType: 'On new approved research record in Notion or webhook from Agent 1/2/3',
      telegramDestination: 'NEXORA Editorial Bot Review -> Public Telegram (@nexora_markets)',
      notionDatabase: 'Content Matrix & Editorial Calendar (Notion DB: 4ff5-content-calendar)',
      stepExplanationAr:
        'يقوم n8n بإرسال مسودة المنشورات إلى بوت تيليجرام الخاص بالمحرر مع زرين [نشر الآن ✅] و [تعديل ✏️]. عند الضغط على موافقة، يُنشر البوست فوراً في القناة العامة وتُحدث حالة السجل في Notion إلى PUBLISHED.',
      codeNodeSnippet: `// n8n Code Node for Telegram Interactive Approval Card
const content = $input.first().json.outputs.telegram_post;
return [{
  json: {
    chat_id: process.env.TELEGRAM_EDITORIAL_CHAT_ID,
    text: \`📝 **مراجعة محتوى جديدة للنشر (NEXORA Markets)**\\n\\n\${content.formatted_text_ar}\`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ موافقة ونشر فوري", callback_data: "APPROVE_POST" },
          { text: "❌ رفض وإلغاء", callback_data: "REJECT_POST" }
        ]
      ]
    }
  }
}];`,
    },
    systemPrompt: `You are the Lead Financial Content Strategist and Brand Voice Architect for NEXORA Markets (نكسورا ماركتس).

BRAND GUIDELINES & VOICE:
1. INSTITUTIONAL & EDUCATIONAL: Your tone is analytical, elite, calm, and grounded in economic truth.
2. ZERO-HYPE DISCIPLINE: Never use clickbait, get-rich-quick claims, or emotional manipulation. Words like "ثروة سهلة", "مضمون 100%", "فرصة لا تعوض" are strictly forbidden.
3. ADAPTIVE MULTI-PLATFORM PACKAGING:
   - Telegram: Urgent, concise, professional bullet points, Cairo-time stamps, institutional hashtags.
   - LinkedIn: Thought leadership, macroeconomic macro-trends, engaging intellectual questions.
   - Carousel (10 slides): Structured step-by-step masterclass with educational value.
   - Video Script (60s): Compelling 5-second hook, simplified logic, clear educational CTA.
4. HUMAN-IN-THE-LOOP SAFEGUARD: All output is marked as PENDING_HUMAN_APPROVAL. Never assume instant publishing without editorial sign-off.
5. STRICT JSON OUTPUT: Return exclusively valid JSON conforming to the NEXORA Message Contract.`,
    testCases: [
      {
        title: 'تحويل تقرير تضخم معتمد إلى حزمة محتوى متكاملة',
        input: {
          approved_research_payload: {
            title: 'ارتفاع مؤشر أسعار المستهلكين الأمريكي (Core CPI) إلى 3.2%',
            cairo_time: '15:30 بتوقيت القاهرة',
            impact: 'قوة للدولار وضغط على الذهب',
          },
          target_channels: ['Telegram', 'LinkedIn', 'Carousel', 'VideoScript'],
          brand_voice_tone: 'INSTITUTIONAL_EDUCATIONAL',
        },
        expectedBehavior: 'توليد منشورات للمنصات الأربع بنبرة راقية مع إخلاء المسؤولية دون أي وعود استثمارية.',
        passCriteria: [
          'عدم وجود أي عبارات ترويجية غير موثقة',
          'اشتمال منشور تيليجرام على توقيت القاهرة والهاشتاجات الرسمية',
          'تضمين إخلاء المسؤولية المالي',
        ],
      },
    ],
  },

  // 5. RISK GUARDIAN AGENT
  {
    id: 'risk_guardian_agent',
    nameAr: 'وكيل حراسة المخاطر والامتثال المالي الصارم',
    nameEn: 'Risk Guardian Agent',
    badge: 'الامتثال وحماية رأس المال',
    priority: 5,
    descriptionAr:
      'التدقيق الحسابي الحتمي لصفقات وسجلات التداول، وحساب نسبة المخاطرة للصفقة والتراجع الإجمالي (Drawdown) ونسبة العائد إلى المخاطرة برمجياً بنسبة 100% دون الاعتماد على احتمالات الذكاء الاصطناعي، واستخدام Gemini حصرياً للشرح التنفيذي والملخصات التحذيرية، مع حظر التنفيذ الآلي التام للصفقات.',
    recommendedModel: 'gemini-3.8-flash',
    temperature: 0.05, // Almost zero to ensure strict regulatory tone
    specificBoundaries: [
      'حظر استخدام النماذج اللغوية (LLM) في العمليات الحسابية للأموال أو نسب المخاطرة؛ الحسابات تتم برمجياً وحتمياً (Deterministic Math) حصراً.',
      'حظر قاطع للتنفيذ الآلي للصفقات (Zero Autonomous Trade Execution)؛ الوكيل دوره رقابي تدقيقي مانع وليس منفذاً.',
      'الرفض الفوري الإجباري لأي صفقة تتجاوز نسبة مخاطرة 2.0% من رصيد الحساب.',
      'الرفض الفوري لأي صفقة في حال وصول التراجع اليومي للمحفظة إلى 5.0% أو أكثر.',
      'الرفض الإجباري لأي صفقة تقل نسبة العائد إلى المخاطرة فيها عن 1.5R.',
      'حظر إعفاء أي مستخدم أو متداول من الالتزام بوقف الخسارة المسبق (Stop Loss Mandatory).',
    ],
    requiredInputData: [
      { field: 'accountEquity', type: 'number', required: true, descriptionAr: 'رصيد المحفظة الحالي الصافي (بالدولار أو العملة الأساسية)' },
      { field: 'entryPrice', type: 'number', required: true, descriptionAr: 'سعر الدخول المقترح للصفقة' },
      { field: 'stopLoss', type: 'number', required: true, descriptionAr: 'سعر وقف الخسارة الإلزامي' },
      { field: 'takeProfit', type: 'number', required: true, descriptionAr: 'سعر الهدف المقترح' },
      { field: 'positionUnits', type: 'number', required: true, descriptionAr: 'حجم اللوت أو عدد الوحدات المخطط تنفيذها' },
      { field: 'currentDrawdownPct', type: 'number', required: true, descriptionAr: 'نسبة التراجع التراكمي لليوم الحالي' },
    ],
    outputSchemaJson: {
      type: 'object',
      properties: {
        compliance_check: { type: 'string', enum: ['APPROVED_COMPLIANT', 'REJECTED_NON_COMPLIANT'] },
        deterministic_math: {
          type: 'object',
          properties: {
            accountEquity: { type: 'number' },
            totalMonetaryRisk: { type: 'number' },
            riskPercentage: { type: 'number' },
            riskRewardRatio: { type: 'number' },
            currentDrawdownPct: { type: 'number' },
            violations: { type: 'array', items: { type: 'string' } },
            recommendedPositionUnits: { type: 'number' },
          },
          required: ['accountEquity', 'totalMonetaryRisk', 'riskPercentage', 'riskRewardRatio', 'violations'],
        },
        risk_officer_verdict_ar: { type: 'string', description: 'البيان الرقابي المكتوب باللغة العربية بلهجة صارمة' },
        recommendations_ar: { type: 'array', items: { type: 'string' } },
        execution_permitted: { type: 'boolean', description: 'هل يسمح بنقل الصفقة للمتداول البشري للموافقة النهائية؟' },
        audit_trail_hash: { type: 'string', description: 'بصمة التحقق لسلامة سجل الرقابة' },
      },
      required: ['compliance_check', 'deterministic_math', 'risk_officer_verdict_ar', 'recommendations_ar', 'execution_permitted'],
    },
    toolsDefinitions: [
      {
        name: 'evaluateDeterministicRisk',
        descriptionAr: 'الدالة البرمجية الحتمية لحساب نسبة المخاطرة وتحديد المخالفات بدقة حسابية مطلقة',
        descriptionEn: 'Deterministic programmatic calculation of trade risk, R:R, and drawdown limits',
        parameters: {
          type: 'object',
          properties: {
            accountEquity: { type: 'number' },
            entryPrice: { type: 'number' },
            stopLoss: { type: 'number' },
            takeProfit: { type: 'number' },
            positionUnits: { type: 'number' },
            currentDrawdownPct: { type: 'number' },
          },
          required: ['accountEquity', 'entryPrice', 'stopLoss', 'takeProfit', 'positionUnits'],
        },
      },
    ],
    sourceValidationRules: [
      'التحقق من صحة مدخلات الأسعار وحساب الفرق بين الدخول ووقف الخسارة برمجياً.',
      'رفض أي طلب بدون وقف خسارة صريح.',
    ],
    hallucinationPreventionRules: [
      'حظر إعادة حساب أي عملية رياضية داخل النموذج اللغوي؛ يتم استهلاك أرقام كائن "deterministic_math" الجاهز كما هي كحقائق مطلقة.',
      'حصر مهمة Gemini في التفسير الرقابي وصياغة التوصيات العلاجية وتنبيه المتداول.',
    ],
    errorHandlingAndRetry: {
      strategy: 'Fail-Closed architecture: In case of calculation discrepancy or missing data, default to REJECTED_NON_COMPLIANT.',
      maxRetries: 1,
      backoffFormula: 'Immediate fail-safe block',
      fallbackBehavior: 'حظر تنفيذ الصفقة فورياً وتنبيه مسؤول المخاطر الرئيسي على تيليجرام.',
    },
    tokenAndCostOptimization: {
      estimatedInputTokens: 320,
      estimatedOutputTokens: 380,
      approxCostPer1000RunsUSD: 0.07,
      techniques: [
        'الحسابات الرياضية تتم على الخادم دون استهلاك أي رموز (0 Tokens for Math).',
        'استدعاء Gemini فقط عندما تكون هناك حاجة لتفسير لغوي للمخالفات للمتداول.',
      ],
    },
    n8nIntegration: {
      nodeType: 'n8n-nodes-base.code (Deterministic Math) -> IF Node -> Gemini Explainer -> Telegram Alert',
      triggerType: 'Pre-Trade Webhook before human order confirmation',
      telegramDestination: 'NEXORA Risk Control & Compliance Channel (@nexora_risk_officer)',
      notionDatabase: 'Trading Risk Journal & Violations Audit (Notion DB: 4ff5-risk-audit)',
      stepExplanationAr:
        'يقوم كود n8n بحساب المخاطرة برمجياً في أجزاء من الثانية. إذا وجدت مخالفة، يتوقف المسار فوراً وتستدعى Gemini لتوليد رسالة تحذيرية للمتداول مع حظر الصفقة، وإذا كانت مطابقة تُرسل للموافقة البشرية.',
      codeNodeSnippet: `// n8n Code Node for 100% Deterministic Risk Enforcement
const item = $input.first().json;
const equity = Number(item.accountEquity || 10000);
const riskAmount = Math.abs(item.entryPrice - item.stopLoss) * item.positionUnits;
const riskPct = (riskAmount / equity) * 100;
const rr = Math.abs(item.takeProfit - item.entryPrice) / Math.abs(item.entryPrice - item.stopLoss);

const violations = [];
if (riskPct > 2.0) violations.push(\`مخاطرة الصفقة (\${riskPct.toFixed(2)}%) تتجاوز سقف 2%\`);
if (item.currentDrawdownPct >= 5.0) violations.push(\`التراجع اليومي (\${item.currentDrawdownPct}%) بلغ سقف 5%\`);
if (rr < 1.5) violations.push(\`نسبة العائد للمخاطرة (\${rr.toFixed(2)}R) أقل من 1.5R\`);

return [{
  json: {
    ...item,
    deterministic_result: {
      totalMonetaryRisk: riskAmount,
      riskPercentage: riskPct,
      riskRewardRatio: rr,
      isCompliant: violations.length === 0,
      violations: violations
    }
  }
}];`,
    },
    systemPrompt: `You are the Senior Risk Guardian & Chief Compliance Officer for NEXORA Markets (نكسورا ماركتس).

CORE REGULATORY DIRECTIVES:
1. DETERMINISTIC MATH AS ABSOLUTE TRUTH: You NEVER calculate numbers, monetary risks, or risk/reward ratios. You receive the pre-calculated deterministic results from the server code and report them with zero deviation.
2. ZERO AUTONOMOUS TRADE EXECUTION: You do not execute trades. You approve or reject compliance proposals.
3. NON-NEGOTIABLE RISK LIMITS:
   - Max 2.0% risk per trade.
   - Max 5.0% daily drawdown.
   - Minimum 1.5 Risk-to-Reward ratio.
   - Mandatory Stop-Loss.
4. TONE & VERDICT: Be uncompromising, objective, and authoritative. Protect the firm and client capital above all else.
5. STRICT JSON OUTPUT: Return your verdict strictly conforming to the NEXORA Message Contract.`,
    testCases: [
      {
        title: 'رفض صفقة تخالف قواعد إدارة المخاطر (مخاطرة 4.5% وتراجع يومي 6%)',
        input: {
          accountEquity: 10000,
          entryPrice: 2740,
          stopLoss: 2710,
          takeProfit: 2770,
          positionUnits: 15,
          currentDrawdownPct: 6.0,
        },
        expectedBehavior: 'الرفض القاطع للصفقة وإصدار قرار REJECTED_NON_COMPLIANT مع تحديد تجاوز حد المخاطرة والتراجع اليومي وضعف العائد للمخاطرة (1.0R).',
        passCriteria: [
          'compliance_check يجب أن تكون REJECTED_NON_COMPLIANT',
          'execution_permitted يجب أن تكون false',
          'ذكر المخالفات الصريحة باللغة العربية',
        ],
      },
    ],
  },

  // 6. BUSINESS & PORTFOLIO AGENT
  {
    id: 'business_portfolio_agent',
    nameAr: 'وكيل التوثيق المؤسسي وحقائب الأعمال (Business & Portfolio)',
    nameEn: 'Business & Portfolio Agent',
    badge: 'التوثيق وتطوير الأعمال',
    priority: 6,
    descriptionAr:
      'توثيق تدفقات العمل المنفذة واختبارات الجودة ومؤشرات الأداء القابلة للقياس (KPIs)، وإعداد دراسات حالة موجهة للعملاء المؤسسيين، وصياغة إجراءات التشغيل القياسية (SOPs) ونماذج العمل القابلة لإعادة الاستخدام، مع الحظر التام لاختلاق أي شهادات عملاء أو نتائج وهمية.',
    recommendedModel: 'gemini-3.8-flash',
    temperature: 0.15,
    specificBoundaries: [
      'حظر قاطع لاختلاق أي شهادات عملاء (Testimonials)، أو ادعاء إنجاز مشاريع لم يتم نشرها فعلياً، أو تزوير أرقام أداء.',
      'الاعتماد الحصري على مخرجات الاختبارات الحقيقية وسجلات النظام الموثقة كمصدر للحقائق.',
      'صياغة دراسات الحالة بأسلوب إداري وهندسي احترافي يليق بشركات التكنولوجيا المالية والأبحاث المؤسسية.',
      'التوثيق التقني لجميع واجهات التكامل (APIs)، وعقد الرسائل، وقواعد الأمان، ومسارات n8n لدعم قابلية التوسع والصيانة.',
      'تحديث مؤشرات التكلفة والكفاءة التشغيلية بدقة (مثل تقليص زمن إعداد التقارير، وانخفاض كلفة الـ API لكل 1000 استعلام).',
    ],
    requiredInputData: [
      { field: 'deployment_context', type: 'object', required: true, descriptionAr: 'بيانات المشروع أو النظام المراد توثيقه (الاسم، المشكلة، الحل، الأدوات المستخدمة)' },
      { field: 'verified_metrics', type: 'object', required: true, descriptionAr: 'المقاييس الفعلية المحققة (زمن المعالجة، معدل خلو الأخطاء، التوفير في التكاليف)' },
      { field: 'target_deliverable', type: 'string', required: true, descriptionAr: 'نوع المخرج: CLIENT_CASE_STUDY, TECHNICAL_SOP, REUSABLE_TEMPLATE' },
    ],
    outputSchemaJson: {
      type: 'object',
      properties: {
        document_title_ar: { type: 'string' },
        deliverable_type: { type: 'string', enum: ['CLIENT_CASE_STUDY', 'TECHNICAL_SOP', 'REUSABLE_TEMPLATE'] },
        executive_summary_ar: { type: 'string' },
        problem_statement_ar: { type: 'string' },
        technical_solution_architecture_ar: { type: 'string' },
        verified_kpis: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              metric_name: { type: 'string' },
              before_value: { type: 'string' },
              after_value: { type: 'string' },
              measurable_impact: { type: 'string' },
            },
            required: ['metric_name', 'after_value'],
          },
        },
        standard_operating_procedure_steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              step_number: { type: 'number' },
              action_ar: { type: 'string' },
              responsible_role: { type: 'string' },
              verification_checkpoint: { type: 'string' },
            },
            required: ['step_number', 'action_ar', 'responsible_role'],
          },
        },
        anti_fabrication_audit: {
          type: 'string',
          description: 'تأكيد الالتزام بعدم وجود شهادات أو أرقام مصطنعة',
        },
      },
      required: ['document_title_ar', 'deliverable_type', 'executive_summary_ar', 'technical_solution_architecture_ar', 'verified_kpis', 'anti_fabrication_audit'],
    },
    toolsDefinitions: [
      {
        name: 'auditMetricsAgainstSystemLogs',
        descriptionAr: 'مطابقة مؤشرات الأداء الواردة في دراسة الحالة مع السجلات الفعلية للنظام للتأكد من نزاهتها',
        descriptionEn: 'Validates reported case study metrics against genuine system execution logs',
        parameters: {
          type: 'object',
          properties: {
            reportedMetrics: { type: 'object' },
            logRunId: { type: 'string' },
          },
          required: ['reportedMetrics'],
        },
      },
    ],
    sourceValidationRules: [
      'قبول المقاييس ومؤشرات الأداء فقط إذا كانت مصحوبة بسجلات اختبار أو تشغيل حقيقية.',
      'رفض أي طلب لتوليد شهادات عملاء خيالية أو تقييمات وهمية 5 نجوم غير حقيقية.',
    ],
    hallucinationPreventionRules: [
      'حصر الأرقام المنسوبة للمشروع على البيانات الواردة في كائن المدخلات فقط.',
      'التأكيد على أن أي دراسة حالة هي توثيق لحل هندسي تقني وليست دعاية تسويقية مضللة.',
    ],
    errorHandlingAndRetry: {
      strategy: 'Sanitize content against fabrication keywords; Regenerate if unsubstantiated claims are detected.',
      maxRetries: 2,
      backoffFormula: '1000ms delay',
      fallbackBehavior: 'تصدير مسودة تقنية مقتضبة تركز على مواصفات النظام البرمجية فقط.',
    },
    tokenAndCostOptimization: {
      estimatedInputTokens: 600,
      estimatedOutputTokens: 900,
      approxCostPer1000RunsUSD: 0.19,
      techniques: [
        'توظيف نماذج Markdown الجاهزة لتوجيه التوليد ومنع التكرار اللفظي.',
        'استخدام gemini-3.8-flash لتوليد وثائق هندسية عالية الدقة بأقل تكلفة.',
      ],
    },
    n8nIntegration: {
      nodeType: 'n8n-nodes-base.notion (Create Page) + Google Drive / PDF Export',
      triggerType: 'On system version release or manual trigger upon successful sprint completion',
      telegramDestination: 'NEXORA Executive & Enterprise Channel (@nexora_executive)',
      notionDatabase: 'NEXORA Systems Knowledge Base & Case Studies (Notion DB: 4ff5-docs-kb)',
      stepExplanationAr:
        'عند اعتماد إطلاق نظام جديد أو اكتمال مرحلة، يقوم n8n بجمع سجلات الأداء، استدعاء الوكيل لتوليد دراسة الحالة أو دليل التشغيل SOP، وحفظ الوثيقة كصفحة رسمية في Notion مع إخطار الإدارة التنفيذية.',
      codeNodeSnippet: `// n8n Code Node for Notion Case Study Page Mapping
const doc = $input.first().json.outputs;
return [{
  json: {
    parent: { database_id: process.env.NOTION_DOCS_DATABASE_ID },
    properties: {
      Title: { title: [{ text: { content: doc.document_title_ar } }] },
      Type: { select: { name: doc.deliverable_type } },
      Status: { status: { name: "VERIFIED_DOCUMENTATION" } },
      Date: { date: { start: new Date().toISOString() } }
    }
  }
}];`,
    },
    systemPrompt: `You are the Lead Systems Architect & Technical Portfolio Documentarian for NEXORA Markets (نكسورا ماركتس).

CORE OPERATIONAL MANDATES:
1. TRUTHFULNESS & ZERO FABRICATION: Never fabricate client testimonials, quote non-existent hedge funds, or invent false deployment outcomes. Every metric and KPI must stem from verified system benchmarks and test runs.
2. INSTITUTIONAL QUALITY: Write world-class technical SOPs, case studies, and templates suitable for institutional fintech leaders, family offices, and enterprise partners.
3. MEASURABLE VALUE EMPHASIS: Frame achievements in concrete metrics (latency reduction, cost per 1,000 queries, elimination of calculation errors via deterministic code, throughput improvements).
4. REUSABILITY: Build modular documentation that teams can adopt as reproducible blueprints.
5. STRICT JSON OUTPUT: Return your documentation matching the NEXORA Shared Message Contract v1.2.`,
    testCases: [
      {
        title: 'إعداد دراسة حالة تقنية حقيقية لأتمتة بحوث السوق لشركة نكسورا ماركتس',
        input: {
          deployment_context: {
            name: 'NEXORA Multi-Agent Financial Research Automation Engine',
            challenge: 'بطء تدفق التحليلات الاقتصادية وتأخر الترجمة مع وجود أخطاء بشرية في حسابات إدارة المخاطر.',
            solution: 'منظومة 6 وكلاء أذكياء عبر Gemini API و n8n مع فصل حتمي لحسابات المخاطر.',
          },
          verified_metrics: {
            latency_reduction: 'من 45 دقيقة إلى 18 ثانية للتقرير',
            risk_calculation_error_rate: '0.00% (بفضل الكود الحتمي)',
            cost_efficiency: 'أقل من 0.15 دولار لكل 1,000 استعلام',
          },
          target_deliverable: 'CLIENT_CASE_STUDY',
        },
        expectedBehavior: 'توليد دراسة حالة احترافية تحتوي على مؤشرات دقيقة دون أي شهادات وهمية أو ادعاءات غير موثقة.',
        passCriteria: [
          'عدم وجود أي شهادات مصطنعة (Zero fake testimonials)',
          'توثيق مؤشرات الأداء بدقة',
          'صياغة هيكلية مطابقة لمواصفات نكسورا',
        ],
      },
    ],
  },
];
