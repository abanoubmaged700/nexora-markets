/**
 * Deterministic Financial Calculations for NEXORA Risk Guardian
 * Strictly executed in deterministic code - never via LLM probabilities.
 */

export interface TradeParameters {
  accountEquity: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionUnits: number;
  currentDrawdownPct: number;
  dailyLossSoFar?: number;
  instrumentType?: 'FOREX' | 'CRYPTO' | 'COMMODITY' | 'STOCK_EGX' | 'STOCK_TASI';
}

export interface RiskAnalysisResult {
  accountEquity: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionUnits: number;
  priceRiskPerUnit: number;
  totalMonetaryRisk: number;
  riskPercentage: number;
  riskRewardRatio: number;
  potentialProfit: number;
  currentDrawdownPct: number;
  isCompliant: boolean;
  violations: string[];
  maxAllowedRiskPct: number;
  maxDailyDrawdownPct: number;
  minAllowedRiskReward: number;
  recommendedPositionUnits: number;
}

export function evaluateDeterministicRisk(params: TradeParameters): RiskAnalysisResult {
  const accountEquity = Math.max(0, Number(params.accountEquity) || 0);
  const entryPrice = Math.max(0, Number(params.entryPrice) || 0);
  const stopLoss = Math.max(0, Number(params.stopLoss) || 0);
  const takeProfit = Math.max(0, Number(params.takeProfit) || 0);
  const positionUnits = Math.max(0, Number(params.positionUnits) || 0);
  const currentDrawdownPct = Math.max(0, Number(params.currentDrawdownPct) || 0);

  const priceRiskPerUnit = Math.abs(entryPrice - stopLoss);
  const totalMonetaryRisk = priceRiskPerUnit * positionUnits;
  const riskPercentage = accountEquity > 0 ? (totalMonetaryRisk / accountEquity) * 100 : 0;

  const potentialProfitPerUnit = Math.abs(takeProfit - entryPrice);
  const totalPotentialProfit = potentialProfitPerUnit * positionUnits;
  
  const riskRewardRatio = priceRiskPerUnit > 0 ? Number((potentialProfitPerUnit / priceRiskPerUnit).toFixed(2)) : 0;

  const maxAllowedRiskPct = 2.0; // 2% max per trade
  const maxDailyDrawdownPct = 5.0; // 5% max daily drawdown
  const minAllowedRiskReward = 1.5; // 1.5R minimum

  // Calculate recommended safe position size targeting exactly 1.5% risk
  const targetMonetaryRisk = accountEquity * 0.015;
  const recommendedPositionUnits = priceRiskPerUnit > 0 ? Number((targetMonetaryRisk / priceRiskPerUnit).toFixed(2)) : 0;

  const violations: string[] = [];

  if (priceRiskPerUnit === 0) {
    violations.push('مستوى وقف الخسارة مطابق لسعر الدخول أو غير محدد');
  }

  if (riskPercentage > maxAllowedRiskPct) {
    violations.push(`نسبة المخاطرة (${riskPercentage.toFixed(2)}%) تتجاوز الحد الأقصى المسموح به (${maxAllowedRiskPct}%)`);
  }

  if (currentDrawdownPct >= maxDailyDrawdownPct) {
    violations.push(`التراجع الحالي للحساب (${currentDrawdownPct.toFixed(2)}%) بلغ أو تجاوز الحد الأقصى للتراجع اليومي (${maxDailyDrawdownPct}%)`);
  }

  if (riskRewardRatio < minAllowedRiskReward && riskRewardRatio > 0) {
    violations.push(`نسبة العائد إلى المخاطرة (${riskRewardRatio}R) أقل من الحد الأدنى المقبول (${minAllowedRiskReward}R)`);
  }

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
    maxAllowedRiskPct,
    maxDailyDrawdownPct,
    minAllowedRiskReward,
    recommendedPositionUnits,
  };
}
