/**
 * Approximate Dutch 2025 net-income estimator (loonheffing, Box 1).
 * Figures: Belastingdienst / Rijksoverheid 2025.
 *
 *  Tax brackets:
 *   ≤ €75,518  →  36.97 %
 *   > €75,518  →  49.50 %
 *
 *  Credits that reduce the tax owed (heffingskortingen):
 *   • Algemene heffingskorting (AHK) — max €3,068
 *     Phases out completely between €24,813 and €75,518.
 *   • Arbeidskorting (AK) — max ~€5,158
 *     Phase-in up to €24,820, plateau to ~€40,000, then phases out to 0 at €124,935.
 *
 *  Not included: toeslagen, zvw-premie employee part (±5.32 %, included in the
 *  36.97 % bracket above), pension contributions, AOW-gap corrections, etc.
 *  Result is a useful approximation, not a payslip calculation.
 */

export function estimateNetMonthly(annualGross: number): number {
  if (annualGross <= 0) return 0;

  // ── Tax before credits ────────────────────────────────────────────────────
  const B1_MAX  = 75_518;
  const T1_RATE = 0.3697;
  const T2_RATE = 0.4950;

  const tax =
    Math.min(annualGross, B1_MAX) * T1_RATE +
    Math.max(0, annualGross - B1_MAX) * T2_RATE;

  // ── Algemene heffingskorting (AHK) ────────────────────────────────────────
  const AHK_MAX      = 3_068;
  const AHK_IN_END   = 24_813;
  const AHK_OUT_END  = 75_518;

  let ahk: number;
  if (annualGross <= AHK_IN_END) {
    ahk = AHK_MAX;
  } else if (annualGross <= AHK_OUT_END) {
    ahk = AHK_MAX * (1 - (annualGross - AHK_IN_END) / (AHK_OUT_END - AHK_IN_END));
  } else {
    ahk = 0;
  }

  // ── Arbeidskorting (AK) ───────────────────────────────────────────────────
  // Phase-in: 0→€11,491 at 8.231 %
  // Build:  €11,491→€24,821 at 29.861 %  (reaches ≈€4,330)
  // Build:  €24,821→€39,958 at 3.085 %  (reaches max ≈€4,796, rounded to AK_MAX below)
  // Phase-out: €39,958→€124,935 at 6.095 %
  const AK_MAX      = 5_158;
  const AK_PH1_END  = 11_491;
  const AK_PH2_END  = 24_821;
  const AK_PH3_END  = 39_958;
  const AK_PH4_END  = 124_935;

  let ak: number;
  if (annualGross <= AK_PH1_END) {
    ak = annualGross * 0.08231;
  } else if (annualGross <= AK_PH2_END) {
    ak = 945 + (annualGross - AK_PH1_END) * 0.29861;
  } else if (annualGross <= AK_PH3_END) {
    ak = 4_440 + (annualGross - AK_PH2_END) * 0.04872;
  } else if (annualGross <= AK_PH4_END) {
    ak = AK_MAX - (annualGross - AK_PH3_END) * 0.06095;
  } else {
    ak = 0;
  }
  ak = Math.max(0, Math.min(ak, AK_MAX));

  const netAnnual = annualGross - Math.max(0, tax - ahk - ak);
  return Math.round(netAnnual / 12);
}
