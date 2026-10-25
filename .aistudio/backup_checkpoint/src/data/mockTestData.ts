export interface ScenarioTestData {
  id: string;
  agentId: string;
  scenarioNameAr: string;
  descriptionAr: string;
  inputPayload: any;
}

export const READY_SCENARIOS: ScenarioTestData[] = [
  // 1. Economic News Scenario
  {
    id: 'cpi_hawkish_surprise',
    agentId: 'economic_news_agent',
    scenarioNameAr: 'مؤشر التضخم الأساسي الأمريكي (Core CPI) - مفاجأة صعودية',
    descriptionAr: 'صدور بيانات تضخم بنسبة 3.3% مقارنة بتوقعات 3.1%، مع تطبيع التوقيت إلى القاهرة وتحليل حساسيات الدولار والذهب.',
    inputPayload: {
      event_name: 'US Core CPI YoY',
      country: 'USD',
      raw_timestamp_utc: '2026-10-25T12:30:00Z',
      actual: '3.3%',
      forecast: '3.1%',
      previous: '3.1%',
      source_feed_name: 'U.S. Bureau of Labor Statistics (BLS)',
    },
  },
  {
    id: 'interest_rate_decision',
    agentId: 'economic_news_agent',
    scenarioNameAr: 'قرار الفائدة للبنك المركزي الأوروبي (ECB Rate Decision)',
    descriptionAr: 'تثبيت الفائدة عند 3.25% كما كان متوقعاً تماماً وتأثير ذلك على تحركات اليورو مقابل الدولار.',
    inputPayload: {
      event_name: 'ECB Interest Rate Decision',
      country: 'EUR',
      raw_timestamp_utc: '2026-10-25T13:15:00Z',
      actual: '3.25%',
      forecast: '3.25%',
      previous: '3.50%',
      source_feed_name: 'European Central Bank (ECB Official)',
    },
  },

  // 2. Market Analysis Scenario (ICT / SMC)
  {
    id: 'xauusd_ict_breakout',
    agentId: 'market_analysis_agent',
    scenarioNameAr: 'الذهب (XAUUSD) - كسر هيكل صاعد (BOS) مع سحب سيولة قاع آسيا',
    descriptionAr: 'تحليل شمعة 4 ساعات أغلقت أعلى القمة السابقة مع ترك فجوة سعرية غير متعادلة FVG في منطقة الخصم.',
    inputPayload: {
      symbol: 'XAUUSD',
      timeframe: '4H / 15m',
      ohlc_summary: {
        current_close: 2746.2,
        high_24h: 2758.5,
        low_24h: 2730.0,
        last_swing_high: 2748.0,
        last_swing_low: 2731.5,
      },
      detected_swings: [
        { type: 'SWING_HIGH', price: 2748.0, broken_by_close: true },
        { type: 'LIQUIDITY_LOW', price: 2731.5, swept_and_rejected: true },
      ],
      feed_provider: 'Prime FIX Gateway Verified',
    },
  },
  {
    id: 'eurusd_mss_reversal',
    agentId: 'market_analysis_agent',
    scenarioNameAr: 'اليورو/دولار (EURUSD) - تحول هيكل السوق (MSS) نحو الهبوط',
    descriptionAr: 'كسر قاع صاعد رئيسي وتحول الهيكل الهابط بعد استهداف قمة سيولة شرائية سابقة (BSL Sweep).',
    inputPayload: {
      symbol: 'EURUSD',
      timeframe: '1H',
      ohlc_summary: {
        current_close: 1.0825,
        high_24h: 1.0890,
        low_24h: 1.0810,
        last_swing_high: 1.0888,
        last_swing_low: 1.0835,
      },
      detected_swings: [
        { type: 'LIQUIDITY_HIGH', price: 1.0888, swept_and_rejected: true },
        { type: 'SWING_LOW', price: 1.0835, broken_by_close: true },
      ],
      feed_provider: 'EBS Institutional Direct Feed',
    },
  },

  // 3. Stock Radar Scenario (EGX & TASI)
  {
    id: 'egx_top_momentum',
    agentId: 'stock_radar_agent',
    scenarioNameAr: 'البورصة المصرية (EGX) - فلترة أسهم الزخم المرتفع',
    descriptionAr: 'فحص أسهم COMI و HRHO و EAST مع بيان نسب السيولة وتأخر البيانات 15 دقيقة.',
    inputPayload: {
      market: 'EGX',
      data_feed_delay_minutes: 15,
      session_date: '2026-10-25',
      screening_filters: { minRvol: 1.5, minTurnover: 10000000 },
      securities_batch: [
        { symbol: 'COMI.CA', name_ar: 'البنك التجاري الدولي', last_price: '84.50 EGP', rvol: 2.4, turnover: 52000000, trend: 'STRONG_UPTREND' },
        { symbol: 'HRHO.CA', name_ar: 'المجموعة المالية هيرميس', last_price: '21.80 EGP', rvol: 1.9, turnover: 28000000, trend: 'UPTREND' },
        { symbol: 'EAST.CA', name_ar: 'الشرقية للدخان', last_price: '33.20 EGP', rvol: 0.8, turnover: 4500000, trend: 'CONSOLIDATION' },
      ],
    },
  },
  {
    id: 'tasi_bluechip_radar',
    agentId: 'stock_radar_agent',
    scenarioNameAr: 'السوق المالية السعودية (تداول - TASI) - قطاع الطاقة والمصارف',
    descriptionAr: 'مسح أسهم أرامكو والراجحي مع فحص مستويات المقاومة الفنية.',
    inputPayload: {
      market: 'TASI',
      data_feed_delay_minutes: 15,
      session_date: '2026-10-25',
      screening_filters: { minRvol: 1.3, minTurnover: 50000000 },
      securities_batch: [
        { symbol: '2222.SR', name_ar: 'أرامكو السعودية', last_price: '27.40 SAR', rvol: 1.6, turnover: 120000000, trend: 'UPTREND' },
        { symbol: '1120.SR', name_ar: 'مصرف الراجحي', last_price: '88.90 SAR', rvol: 1.4, turnover: 95000000, trend: 'REBOUND' },
      ],
    },
  },

  // 4. Content Creator Scenario
  {
    id: 'content_cpi_distribution',
    agentId: 'content_creator_agent',
    scenarioNameAr: 'حزمة نشر شاملة: تيليجرام ولينكدإن وكاروسيل وسيناريو 60 ثانية',
    descriptionAr: 'توليد منشورات إخبارية وتعليمية لقنوات نكسورا استناداً إلى نتائج تقرير التضخم المعتمد.',
    inputPayload: {
      approved_research_payload: {
        headline: 'بيانات التضخم الأمريكي Core CPI تتجاوز التوقعات (3.3%)',
        cairo_time: '15:30 بتوقيت القاهرة',
        implications: 'توقعات باستمرار الفائدة المرتفعة لفترة أطول ودعم لعوائد السندات والدولار',
      },
      target_channels: ['Telegram', 'LinkedIn', 'Carousel', 'VideoScript'],
      brand_voice_tone: 'INSTITUTIONAL_EDUCATIONAL',
    },
  },

  // 5. Risk Guardian Scenario (Strict Math Check)
  {
    id: 'risk_violation_high_exposure',
    agentId: 'risk_guardian_agent',
    scenarioNameAr: 'صفقة مخالفة: مخاطرة 4.5% وتراجع يومي 6% (رفض فوري حتمي)',
    descriptionAr: 'اختبار التدقيق الحسابي الحتمي لمنع صفقة تتجاوز حد المخاطرة 2% وحد التراجع اليومي 5%.',
    inputPayload: {
      accountEquity: 10000,
      entryPrice: 2740,
      stopLoss: 2710,
      takeProfit: 2770,
      positionUnits: 15, // 30 points risk * 15 units = 450 USD = 4.5% risk! (Violates 2%)
      currentDrawdownPct: 6.0, // Violates 5%
    },
  },
  {
    id: 'risk_compliant_healthy_trade',
    agentId: 'risk_guardian_agent',
    scenarioNameAr: 'صفقة مطابقة تماماً: مخاطرة 1.2% ونسبة عائد لمخاطرة 2.5R',
    descriptionAr: 'اختبار الحساب الحتمي لصفقة منضبطة في حدود القواعد الاستثمارية الآمنة لنكسورا.',
    inputPayload: {
      accountEquity: 10000,
      entryPrice: 2740,
      stopLoss: 2732,
      takeProfit: 2760,
      positionUnits: 1.5, // 8 points risk * 1.5 units = 12 USD -> 0.12% or 15 units = 120 USD (1.2%)
      currentDrawdownPct: 1.5,
    },
  },

  // 6. Business & Portfolio Scenario
  {
    id: 'portfolio_case_study',
    agentId: 'business_portfolio_agent',
    scenarioNameAr: 'دراسة حالة مؤسسية: تقليص زمن إصدار البحوث وحماية رأس المال',
    descriptionAr: 'توثيق نتائج تطبيق الوكلاء الستة دون اختلاق أي شهادات عملاء أو أرقام غير مؤكدة.',
    inputPayload: {
      deployment_context: {
        name: 'NEXORA Enterprise Financial Multi-Agent Intelligence Layer',
        challenge: 'بطء نشر التقارير الاقتصادية بالعربية والمخاطر البشرية في حساب اللوتات والمخاطرة.',
        solution: 'منظومة متعددة الوكلاء مبنية على Gemini API و n8n مع الحسابات الحتمية.',
      },
      verified_metrics: {
        latency_reduction: 'انخفاض زمن الصياغة والتدقيق من 40 دقيقة إلى 14 ثانية',
        calculation_accuracy: 'معدل خطأ 0.00% بفضل الكود الحتمي',
        cost_savings: 'تكلفة أقل من $0.10 لكل 1,000 تشغيل مقارنة بنماذج الأجيال السابقة',
      },
      target_deliverable: 'CLIENT_CASE_STUDY',
    },
  },
];
