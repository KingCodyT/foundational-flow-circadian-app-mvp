# Foundational Flow Confidence Engine v1 Audit

## 1. Final Verdict

The current confidence engine is directionally conservative and mostly coherent, but it is not yet a fully faithful semantic confidence model.

It does implement an initial confidence estimate for behavioral signals, calculates confidence from questionnaire evidence, and exposes a numeric 0..1 score with provenance metadata. That is useful and mostly aligned with the intended architecture. However, the current implementation does not yet model evidence independence explicitly, does not weight evidence by semantic strength in a formal way, and does not meaningfully revise confidence from longitudinal daily evidence.

The design is therefore better described as a direct-assessment confidence approximation rather than a true interpretation-confidence engine. It is mostly sound for conservative early-stage estimation, but it is not complete enough to satisfy the locked confidence rules in a fully semantically faithful way.

## 2. Current Authoritative Confidence Path

The actual executable path is:

questionnaire / daily evidence
→ evidence semantics and signal mapping
→ initial confidence interpretation
→ signal model
→ primary target / intervention / YOU

Actual implementation flow:

- Assessment data is built in [lib/personalization/initial-state.ts](../../lib/personalization/initial-state.ts)
- Initial confidence is assigned in [lib/personalization/initial-confidence.ts](../../lib/personalization/initial-confidence.ts)
- Daily evidence is summarized and applied in [lib/personalization/daily-evidence.ts](../../lib/personalization/daily-evidence.ts)
- The signal model, classifications, and confidence shape live in [lib/personalization/types.ts](../../lib/personalization/types.ts)
- Primary target selection is computed in [lib/personalization/primary-target.ts](../../lib/personalization/primary-target.ts)
- Intervention selection uses some downstream confidence metadata in [lib/personalization/intervention-eligibility.ts](../../lib/personalization/intervention-eligibility.ts)
- The YOU view reads and displays the signal confidence in [views/you-page.tsx](../../views/you-page.tsx)

The actual behavior is:

- Questionnaire answers become evidence items on each signal.
- Behavioral signals are filtered for confidence assignment.
- Confidence is assigned from evidence count and answer-score bands.
- Daily evidence updates coaching progression and notes, but does not materially re-score confidence.
- Signal confidence is not a first-class determinant in primary-target selection.
- The user-facing view derives a coarse label from the score.

This means the current authoritative path is not a fully independent confidence engine; it is an initial-confidence estimate plus a simple evidence summary path.

## 3. Initial Confidence Behavior

Current rules in [lib/personalization/initial-confidence.ts](../../lib/personalization/initial-confidence.ts):

- Confidence is only assigned to behavioral signals.
- Non-behavioral signals are ignored for confidence.
- Confidence score is a numeric value in the range 0..1.
- The file defines score bands:
  - HIGH = 0.9
  - MODERATE = 0.6
  - REDUCED = 0.4
  - LOW = 0.15
- The score is not a probability; it is a heuristic internal certainty value.
- A score label helper in the UI interprets 0.8+ as High confidence, 0.5+ as Moderate confidence, otherwise Early signal.

Exact current rules:

- If no answered evidence exists, confidence is LOW.
- If one answered direct evidence item exists:
  - if the evidence is marked legacyMapping, confidence is MODERATE
  - otherwise confidence is HIGH
- If multiple answered evidence items exist:
  - the code maps each answerScore into a coarse band using a helper that maps score bands to ESTABLISHED / DEVELOPING / NEEDS_ATTENTION
  - if all evidence lands in the same band and none are legacyMapping, confidence is HIGH
  - if all evidence lands in the same band but includes legacyMapping, confidence is MODERATE
  - otherwise confidence is REDUCED
- sources are collected from questionId values for the final confidence metadata.

Important observations:

- This is not a semantic confidence model; it is a heuristic based on evidence count and score band agreement.
- Raw answer score participates because the code uses score bands to decide agreement and disagreement.
- Legacy evidence is treated as lower-confidence but not semantically distinct beyond the boolean flag.
- Missing evidence is explicitly low confidence, which is consistent with the locked rule.

## 4. Evidence Independence

Current code does not explicitly represent evidence independence.

There is no first-class concept like:

- independent evidence
- duplicate evidence
- repeated question answer
- same question vs different question
- same source vs different source
- same semantic type vs different semantic type

Instead, the engine effectively treats more evidence as more confidence when the answer-score bands agree. That means:

- repeated evidence from the same underlying question or same behavioral theme can be counted as new evidence
- different question IDs are assumed to be independent only by default, not by explicit rule
- no deduplication occurs before scoring
- duplicates can incorrectly inflate confidence if they are semantically redundant but not literally identical

This is a genuine gap relative to the locked principle that confidence should reflect the quality and agreement of evidence, not merely the amount of data.

## 5. Evidence Semantics

The key semantic classes are defined in [lib/personalization/types.ts](../../lib/personalization/types.ts):

- BEHAVIOR
- OUTCOME
- CONTEXT_CONSTRAINT
- DERIVED_ENVIRONMENT

The code distinguishes these classes structurally, but confidence logic does not formally weight them by semantic strength.

Current implementation behavior:

- direct behavior evidence is the only evidence class directly used to assign confidence in initial confidence logic
- outcome evidence is not explicitly treated as a direct behavioral indicator
- context and constraint evidence are not used to lower or raise direct behavioral confidence in a formal semantic way
- derived environment evidence is included in the signal evidence list but is not treated as direct behavior evidence

Where semantics are present:

- behavioral signal classification matters because only behavior signals receive confidence assignment.
- outcome and environment evidence are tracked as separate signal classes but are not deeply integrated into confidence weighting.

Where semantics are missing or partial:

- there is no explicit semantic weighting such as:
  - direct behavior > indirect outcome > environmental context > constraint
- there is no formal rule that a single direct behavior signal should stay high confidence even without corroboration
- no explicit distinction is made between evidence that directly indicates a behavior and evidence that merely supports interpretation

This means the engine does partially respect semantic classes, but not fully enough to preserve the locked rules.

## 6. Lack of Corroboration

Locked rule:

A clear direct behavior signal must not become low-confidence merely because it lacks corroboration.

Current code satisfies this in a limited but important way:

- In [lib/personalization/initial-confidence.ts](../../lib/personalization/initial-confidence.ts), a single direct questionnaire answer is assigned HIGH confidence when it is not marked legacyMapping.
- This means a single strong direct behavioral signal does not collapse to low confidence only because the system lacks corroboration.

Why this is semantically sound:

- direct behavior evidence is the strongest indicator of the relevant behavior being assessed
- if the direct signal is unambiguous and not contradicted, the system does not need additional corroboration to be confident in the interpretation

Why this is still incomplete:

- It assumes that a single direct answer is inherently high-confidence without checking whether the evidence is independent or whether it is a stale or duplicated item
- The code does not distinguish direct behavioral strength beyond the mapping and answer score band

So, the rule is preserved by current behavior, but not by a fully robust semantic mechanism.

## 7. Conflict Handling

Conflict handling is present but simple.

In [lib/personalization/initial-confidence.ts](../../lib/personalization/initial-confidence.ts):

- multiple evidence entries are compared by score band via mapScoreToBand
- if all bands are the same, confidence is high or moderate depending on legacy mapping
- if they differ, confidence is REDUCED

This means conflict is detected as disagreement in answer-score bands, not as a richer semantic contradiction.

Important distinctions:

- raw score disagreement counts as conflict
- semantic contradiction is not modeled explicitly
- behavior-vs-outcome disagreement is not handled as a distinct semantic class in confidence logic
- indirect evidence can weaken confidence only indirectly through the score-band disagreement model, not by a formal semantic hierarchy

This is a partial implementation of the locked rule that conflicting evidence should lower confidence, but it is not semantically rich enough to distinguish weak indirect conflict from strong direct contradiction.

## 8. Score Involvement

QuestionOption.score is used in multiple places.

Relevant files:

- [types/circadian.ts](../../types/circadian.ts) defines the raw question option scoring model
- [lib/personalization/initial-state.ts](../../lib/personalization/initial-state.ts) uses answerScore to map directly to coaching state via mapScoreToCoachingState
- [lib/personalization/initial-confidence.ts](../../lib/personalization/initial-confidence.ts) uses answerScore to group answers into bands for confidence
- [lib/personalization/primary-target.ts](../../lib/personalization/primary-target.ts) derives a severity score from signal evidence and uses it in target selection
- [lib/personalization/severity.ts](../../lib/personalization/severity.ts) formalizes severity as a distinct semantic dimension

Current usage of score is not cleanly limited to one concept:

- answerScore participates in coaching-state mapping
- answerScore participates in confidence assignment
- answerScore participates in target severity calculation
- score therefore functions as both an evidence intensity signal and a proxy for multiple concepts

This is the main leakage risk:

- confidence is not a pure model of interpretation certainty
- the code encodes score-driven semantics that blur confidence, severity, and coaching-level intent

Severity Model v1 is kept separate in its own logic, but the underlying score semantics are still shared across domains. This is not a direct contradiction, but it is a clear leakage risk.

## 9. Daily / Longitudinal Evidence

Current behavior in [lib/personalization/daily-evidence.ts](../../lib/personalization/daily-evidence.ts):

- repeated completed daily events are summarized into DailyEvidenceSummary
- those summaries are used to advance coachingState via stateFromRepeatedEvidence
- the system can move NEEDS_ATTENTION to DEVELOPING or ESTABLISHED based on completed-days counts
- daily evidence is appended to the signal.evidence array as synthetic entries
- confidence.lastEvidenceAt is updated
- confidence.score is left unchanged

Therefore:

- increase confidence: not implemented
- decrease confidence: not implemented
- revise confidence: not implemented
- replace initial confidence: not implemented
- create longitudinal confidence metadata: partially implemented, but only lastEvidenceAt and notes; no score recalculation

This is important: the architecture intends daily evidence to contribute over time, but the executable interpretation does not actually recalculate confidence. The code currently upgrades coaching state, not confidence.

This is a distinction between architectural intent and executable behavior.

## 10. Staleness and Reconsideration

Search of the current code shows no explicit executable staleness mechanism for confidence.

No implemented logic currently handles:

- stale evidence
- last observed recency-based confidence penalty
- reconsideration triggers when context changes
- timezone or location change as a confidence re-evaluation trigger
- schedule change or season/day-length change as a confidence trigger
- signal conflict as a confidence-triggering event

The system does keep:

- lastEvidenceAt in confidence metadata
- daily evidence timestamps
- derived environment data

But no code currently values those timestamps to decay confidence or force re-analysis.

Confidence does not decay automatically with time. This matches the locked rule. However, explicit reconsideration triggers are not implemented in executable logic; they exist only as product intent or future design possibilities.

## 11. Primary Target Use

The primary target selector in [lib/personalization/primary-target.ts](../../lib/personalization/primary-target.ts) does not currently use confidence as a formal input.

Behavior:

- eligible behavioral signals are chosen based on:
  - signal classification
  - coachingState in NEEDS_ATTENTION or DEVELOPING
  - severity derived from signal evidence
  - biological hierarchy priority
- confidence is not used to block eligibility
- confidence is not used as a tiebreaker
- confidence does not affect severity override
- confidence is ignored in target selection

This is consistent with the locked principle that low corroboration alone should not erase a clear direct signal, but it also means confidence does not play an active role in target prioritization today.

## 12. Intervention Use

Intervention logic is primarily in [lib/personalization/intervention.ts](../../lib/personalization/intervention.ts) and [lib/personalization/intervention-eligibility.ts](../../lib/personalization/intervention-eligibility.ts).

Current behavior:

- intervention level is determined by biology, timing, actionability, and coaching state
- the eligibility layer may reduce risk or intensity using a confidenceScore input when passed
- the code checks if confidenceScore != null and confidenceScore < 0.3 then a Level 3 proposal is downgraded to Level 2

This means confidence can affect intervention intensity at the eligibility stage, but only indirectly and opportunistically.

Notably:

- intervention selection is not driven by confidence as a primary semantic input
- confidence does not gate biological truth or target selection
- confidence does not generally suppress a valid direct behavior signal
- there is no general confidence-to-silence mechanism beyond a low-confidence downgrade rule in the eligibility layer

So intervention use of confidence is partial and secondary, not architecturally central.

## 13. YOU View Fidelity

The YOU view is defined in [views/you-page.tsx](../../views/you-page.tsx).

Current behavior:

- it calculates personalization from answers and daily evidence
- it assigns initial confidence via assignInitialConfidence
- it reads each signal’s confidence score
- it converts the score into a coarse display label: High confidence / Moderate confidence / Early signal
- it displays the label next to the primary target

This is faithful at the coarse summary level: it is reading actual engine confidence, not reconstructing a new value independently.

However, the view is limited:

- it does not show evidence provenance or the reason behind confidence
- it does not show whether confidence comes from direct behavior, outcome, or context
- it does not distinguish between high confidence due to a direct answer and high confidence due to repeated weak evidence
- the language is intentionally simplified, which may overstate certainty without sufficient explanation

This is acceptable as a summary layer, but not as a deep explanation layer.

## 14. Confidence vs Severity

Severity asks:

“How materially mismatched is the behavior?”

Confidence asks:

“How strongly does the evidence support that interpretation?”

Current implementation partially preserves the distinction:

- severity is formalized in [lib/personalization/severity.ts](../../lib/personalization/severity.ts)
- confidence is a separate field in [lib/personalization/types.ts](../../lib/personalization/types.ts)
- the target selection logic uses severity to choose the dominant behavioral signal

The gap is that the same raw score model sits underneath both domains, and confidence assignment in [lib/personalization/initial-confidence.ts](../../lib/personalization/initial-confidence.ts) uses score bands that are also a byproduct of the same data used to derive severity.

This does not mean the code is wrong, but it does mean the separation is not perfectly clean in implementation. The concepts are mostly distinct in architecture, but the raw score pipeline still creates leakage risk.

## 15. Confidence vs Coaching State

The architecture is capable of permitting combinations such as:

- NEEDS_ATTENTION + HIGH confidence
- DEVELOPING + MODERATE confidence
- ESTABLISHED + HIGH confidence

This is allowed by the data model because confidence is stored separately on each signal while coachingState is another property on the same signal. There is no hard coupling that prevents a signal from being NEEDS_ATTENTION and high-confidence at the same time.

In practice, the engine does not fully treat those concepts as separate in all logic, but the data model still supports clean combinations. This is a strength of the current architecture.

## 16. Legacy Contamination

Potential contamination areas:

- aggregate score influence in initial confidence logic
- mapping answer scores into confidence bands rather than independent evidence semantics
- legacyMapping flag creating a separate confidence discount path
- old category-score logic inherited from earlier questionnaire reasoning
- score-based heuristics reused across coaching state, severity, and confidence
- dead or duplicate helper patterns are not obvious in the active flow, but the score-to-band mapping is a legacy contamination risk because it uses old scoring conventions as proxies for confidence

This is not a general rewrite problem, but it is a real source of conceptual blending between old score semantics and the newer confidence model.

## 17. Test Coverage

Coverage currently includes a number of general personalization and timing validations, but confidence-specific tests are limited.

What is covered:

- timing and personalisation behavior
- severity mapping and hierarchy ordering
- intervention fallback behavior
- general signal selection and constraints
- behavioral target selection under hierarchy and severity rules

What is not substantially covered:

- single direct evidence high confidence scenario
- multiple independent direct evidence increases confidence
- duplicate evidence inflation risk
- direct behavior outranking outcome/context evidence
- conflict semantics beyond raw score disagreement
- lack of corroboration preserving direct behavior confidence
- daily evidence re-scoring of confidence
- staleness or context-change reconsideration triggers

The current tests are strong on severity and target selection, but weak on the explicit confidence semantics required by the locked architecture.

## 18. What Is Working Correctly

The following behaviors are worth preserving:

- Confidence is stored as a numeric score plus provenance metadata.
- Missing evidence yields low confidence instead of false certainty.
- Conflicting evidence reduces confidence.
- A single clear direct behavior answer can remain high confidence.
- Confidence is kept distinct from signal classification and on-signal evidence.
- Confidence does not automatically decay by time in the current code.
- The system recognizes that outcome/context evidence should not masquerade as direct behavior.
- The UI displays a coarse but understandable confidence label.

## 19. Architectural Gaps

### CRITICAL
- No explicit evidence-independence model.
- No semantic weighting for direct behavior vs indirect support.
- No real longitudinal confidence recalculation from daily evidence.

### HIGH
- Conflict handling is too simplistic and not semantically grounded.
- Raw score bands are reused across confidence and severity logic, causing conceptual leakage.
- Confidence lacks a formal “reconsideration” trigger for staleness/context conflict.

### MEDIUM
- Primary target selection ignores confidence as a decision factor.
- Intervention eligibility only uses confidence opportunistically as a low-confidence downgrade trigger.
- YOU view oversimplifies certainty.

### LOW
- Labeling language may overstate certainty without explanation.

## 20. Locked-Rule Compliance Table

| Rule | Status |
|---|---|
| 1. Independent evidence increases confidence | PARTIAL |
| 2. Lack of corroboration does not invalidate clear direct behavior | IMPLEMENTED |
| 3. Direct behavior outranks weaker indirect evidence | PARTIAL |
| 4. Outcomes support but do not prove causation | PARTIAL |
| 5. Context is not behavior | IMPLEMENTED |
| 6. Constraints do not reduce biological truth/confidence by themselves | IMPLEMENTED |
| 7. Conflicts lower confidence | IMPLEMENTED |
| 8. Missing evidence produces uncertainty, not false negative | IMPLEMENTED |
| 9. Confidence does not decay by timer | IMPLEMENTED |
| 10. Staleness/context/conflict may trigger reconsideration | PARTIAL |
| 11. Assessment creates initial confidence, not fake history | IMPLEMENTED |
| 12. Daily evidence can eventually refine confidence | PARTIAL |
| 13. Confidence remains separate from severity | PARTIAL |
| 14. Confidence remains separate from coaching state | IMPLEMENTED |

## 21. Initial Confidence Verdict

Mostly sound with specific gaps.

Why: it behaves conservatively and usually preserves direct-behavior truth. But the confidence mechanism is still too score-driven and not semantically rich enough to represent independence, direct-vs-indirect evidence, and repeated/duplicate evidence correctly.

## 22. Independence Verdict

Evidence independence is not properly represented.

The current model assumes that additional evidence inherently adds confidence when its score bands agree, but it does not verify whether the evidence is independent, duplicate, or semantically redundant. That is a real gap.

## 23. Conflict Verdict

Conflict handling is only partially semantically sound.

It does lower confidence when answers disagree, but it does so using raw score-band disagreement rather than a true semantic conflict model. That means weak indirect contradictions and strong direct contradictions are not distinguished in a formal way.

## 24. Longitudinal Confidence Verdict

Confidence currently does not evolve from real daily evidence in executable logic.

The code updates coachingState and evidence metadata over time, but confidence.score itself is not recalculated. Therefore, the longitudinal confidence model is not fully implemented.

## 25. Staleness / Reconsideration Verdict

Only partial product-architecture intent exists.

There are timestamps and evidence recency fields, but there is no executable staleness model, no confidence decay, and no explicit context-change or schedule-change reconsideration trigger. This is listed as architectural intent rather than implemented logic.

## 26. Confidence / Severity Separation Verdict

Severity Model v1 and confidence are mostly separated at the model layer, but not completely cleanly separated in the implementation pipeline.

The risk is not a major contradiction, but the raw score semantics are still reused across multiple layers. That means the separation is functionally workable but conceptually soft.

## 27. YOU View Verdict

YOU faithfully presents a coarse confidence summary, but not a deep evidence-grounded confidence report.

It reads authoritative signal confidence values and surfaces them in a simplified way, but it does not explain what evidence drives the confidence, does not distinguish evidence type, and may overstate certainty in a product-facing way without exposing its reasoning.

## 28. Smallest Recommended Implementation Batch

Recommended next batch:

1. Add explicit evidence identity and semantic class tracking in [lib/personalization/initial-state.ts](../../lib/personalization/initial-state.ts)
   - dedupe repeated evidence by questionId and source
   - separate direct behavior, outcome, context, and constraint evidence semantically

2. Replace the current confidence-score heuristic in [lib/personalization/initial-confidence.ts](../../lib/personalization/initial-confidence.ts)
   - weight direct behavior higher than indirect evidence
   - treat corroboration only when evidence is independent and semantically compatible
   - preserve high confidence for a clear direct behavior signal without corroboration
   - lower confidence for semantic contradiction, not just raw disagreement

3. Add confidence recalculation at the daily evidence layer in [lib/personalization/daily-evidence.ts](../../lib/personalization/daily-evidence.ts)
   - allow repeated same-direction independent evidence to increase confidence
   - keep staleness as a review trigger, not automatic decay

This is the smallest coherent batch that materially improves fidelity without changing Severity Model v1, constraint adaptation, or broader architecture.

This recommendation intentionally excludes:

- generalized Bayesian engine
- confidence decay timer
- machine learning
- another scoring system
- changes to Severity Model v1
- changes to constraint adaptation
- travel detection
- Voice Layer implementation
- UI redesign

## 29. Exact File Map

### REQUIRED

- [lib/personalization/types.ts](../../lib/personalization/types.ts)
  - defines confidence shape and signal semantics

- [lib/personalization/initial-state.ts](../../lib/personalization/initial-state.ts)
  - builds evidence objects and signal state; this is the source for evidence identity and semantic classification

- [lib/personalization/initial-confidence.ts](../../lib/personalization/initial-confidence.ts)
  - current executable confidence engine for initial assessment

- [lib/personalization/daily-evidence.ts](../../lib/personalization/daily-evidence.ts)
  - current longitudinal evidence path; where true confidence evolution would be implemented

- [lib/personalization/primary-target.ts](../../lib/personalization/primary-target.ts)
  - confirms confidence is not currently a target-selection determinant

- [views/you-page.tsx](../../views/you-page.tsx)
  - displays confidence to the user; this is the fidelity check for the presentation layer

### ONLY IF NEEDED

- [lib/personalization/severity.ts](../../lib/personalization/severity.ts)
  - only if validating leakage between confidence and severity semantics

- [lib/personalization/intervention-eligibility.ts](../../lib/personalization/intervention-eligibility.ts)
  - only if confirming how confidence interacts with intervention downgrades

- [lib/personalization/day1.ts](../../lib/personalization/day1.ts)
  - only if validating the initial assembly path from assessment to confidence

- [lib/personalization/signal-registry.ts](../../lib/personalization/signal-registry.ts)
  - only if verifying semantic signal classification and registry semantics

## Summary

The current confidence engine is not yet a fully semantically faithful confidence model, but it is not a broken or contradictory design. It is a conservative, score-based approximation that captures a number of the right instincts: low confidence for missing evidence, reduced confidence for conflict, high confidence for one direct answer, and no automatic time decay.

Its main weaknesses are:

- no explicit independence model
- no semantic weighting for direct vs indirect evidence
- no real longitudinal confidence recalculation
- limited conflict semantics
- leakage risk between score-based confidence and severity logic

Those gaps are real, but they do not invalidate the current architecture completely. They define the smallest coherent next implementation batch for the confidence engine without changing severity model policy or broader constraint adaptation behavior.
