/** Selects artwork only. Never selects a coaching target, creates evidence, or advances a signal. */
export function selectJourneyReference(input: {
  overview: boolean;
  hour: number;
  now: number;
  sunrise: number | null;
  sunset: number | null;
  morningEvidenceAt: number | null;
  sleepOpportunity: boolean;
  hasAction: boolean;
}): number {
  if (input.overview) return 6;
  if (input.sleepOpportunity) return 15;
  const afterSunset = input.sunset !== null && input.now >= input.sunset;
  if (afterSunset) {
    // A visual sunset transition, not a claim that civil darkness has been calculated.
    if (input.now - input.sunset! < 30 * 60_000) return 12;
    return input.hasAction ? 13 : 14;
  }
  if (input.hour >= 17) return 11;
  if (input.hour < 4) return 14;
  if (input.morningEvidenceAt !== null) {
    return input.now - input.morningEvidenceAt < 15 * 60_000 ? 9 : 10;
  }
  if (input.sunrise !== null ? input.now < input.sunrise : input.hour < 6) return 7;
  return 8;
}
