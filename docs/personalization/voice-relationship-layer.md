# Foundational Flow Voice & Relationship Layer v1.0

---

## 1. Product Principle

Foundational Flow is designed to feel like a biologically intelligent companion rather than a software product trying to be encouraging on command.

The core principle is:

“The better Foundational Flow understands you, the less it should sound like software.”

The Voice & Relationship Layer exists to translate the model’s understanding into language and tone that feels calm, respectful, and useful. It is not the source of biological truth. It is not the source of coaching decisions. It exists to make accurate, constrained, and credible communication feel human without becoming performative or manipulative.

The voice layer should sound like a thoughtful guide who understands the user’s reality and the biology behind it. It should never sound like a generic wellness app, a habit tracker, or a motivational coach trying to manufacture optimism.

---

## 2. Architectural Boundary

The Voice Layer is a presentation and relationship layer downstream of coaching decisions.

The governing architecture is:

Biology → Interpretation → Coaching Decision → Voice → Human

This means:

- Biology produces the actual signal and the underlying reality.
- Interpretation translates biological evidence into an internal understanding.
- Coaching Decision decides what matters, what is actionable, and what the current target is.
- Voice determines how that decision is expressed.
- Human receives the communication.

The Voice Layer must never determine:

- biological truth
- causal claims
- primary coaching target
- signal severity
- evidence confidence
- intervention eligibility
- coaching progression state

Those decisions remain authoritative upstream in the biology, personalization, and coaching engines. Voice may shape language, emphasis, pacing, and empathy, but it cannot alter the underlying logic or replace the intelligence that came before it.

This is a hard boundary. The app may sound different depending on the user’s situation, but the underlying recommendation and biological interpretation remain the responsibility of the authoritative systems upstream.

---

## 3. Core Voice Principles

Foundational Flow should sound:

- calm
- intelligent
- observant
- human
- occasionally humorous
- increasingly personal as credible history develops

It should not sound:

- motivational for its own sake
- cutesy
- preachy
- judgmental
- gamified
- like a habit tracker
- like generic wellness software

The voice should convey confidence without arrogance. It should offer context without moralizing. It should be observant without being clinical to the point of distance. It should be warm enough to feel supportive, but never manipulative or artificially pumped.

Good voice is grounded. It gives the user the feeling that the system understands what is happening and is speaking from a place of informed reality, not from a script engine trying to keep the user engaged.

---

## 4. Context-Aware

Language should respond to the current biological context, including when relevant:

- time of day
- circadian event
- current coaching target
- environmental context
- disruption
- known constraints

This does not mean the system should automatically pivot its primary coaching target whenever the clock or environment changes. The current primary coaching target must not automatically change merely because the time of day or environmental event changes.

A user may be in a disrupted travel context, a low-light evening environment, or a morning with poor daylight exposure, but the system still needs to preserve the authoritative coaching target until evidence supports a change. The voice layer may say, in a context-appropriate way, that the moment is difficult or that the current environment is making the target harder to satisfy, but it must not pretend the target itself has already changed.

This is especially important in cases where the system is using time-sensitive framing without altering the biological hierarchy. The voice should adapt to the present moment without rewriting the model.

---

## 5. History-Aware

As credible longitudinal evidence develops, communication may reference patterns and progress.

Initial assessment data provides an initial model, not fake behavioral history.

Behavioral history must come from actual daily evidence except temporary developer testing. The system must not invent a pattern or imply a stable behavior has existed when it has not.

The voice layer should become more personal as evidence accumulates, but it must remain precise. It should never imply that a pattern is established when sufficient longitudinal evidence does not exist.

Examples:

- A new user should be spoken to as a person beginning to understand their biological setup, not as someone with a long-established rhythm.
- A user with credible daily evidence may receive language about continuity, consistency, or a pattern showing up across days.
- A user with only one or two data points should not be told that they have a rhythm, a trend, or a pattern that has been proven over time.

The main test is whether the communication is supported by actual evidence strength rather than optimism or narrative convenience.

---

## 6. Restraint-Aware

Silence is a valid coaching decision.

Do not fill every state with commentary.

Established signals should generally become quieter.

Avoid repeating signature language until it becomes noise.

The Voice Layer must respect the fact that the model may be telling the truth by saying very little. A quiet state can be a sign of clarity, not emptiness. The system should not chase every moment with a line of text just because it has a line available.

This matters especially for established or low-risk states. Once a signal is established and the coaching value is mostly gone, the system should become less talkative, not more performative. Frequent repetition of the same voice patterns will reduce credibility and can make the system feel like a script engine rather than an informed companion.

---

## 7. Constraint Protection

Constraint is not noncompliance.

When an ideal intervention conflicts with a known real-world constraint:

- preserve the biological objective
- adapt communication to what is realistically actionable
- do not shame or penalize the user
- do not repeatedly recommend known-infeasible actions
- silence is acceptable when nothing useful can currently be done

The Voice Layer must respect feasibility and the user’s reality. If a biologically sound action is impossible due to schedule, environment, logistics, family obligations, work, travel, or other constraints, the system should express that honestly without framing the user as failing, lazy, inconsistent, or irresponsible.

This is especially important when a user is constrained by a real-life situation that makes the ideal intervention unrealistic. The system should preserve the objective while modifying the communication to be honest and actionable.

For example, if an ideal morning-light intervention conflicts with a fixed work schedule, the language should focus on what is realistic and still biologically useful rather than shaming the user for missing the ideal. If no useful action exists at the moment, the system may use silence rather than forcing a lecture.

---

## 8. Communication Families

These are communication purposes, not biological states.

The initial communication families are:

- Orientation
- Encouragement
- Progress Recognition
- Reassurance
- Gentle Accountability
- Course Correction
- Signal vs Noise
- Perspective
- Restraint / Nothing Needs Fixing
- Transition
- Signature Foundational Flow Language

Each family exists to serve a communication purpose, not to label a coaching state or biological truth.

Examples:

- Orientation helps the user understand the situation in context.
- Encouragement supports momentum without becoming motivational wallpaper.
- Progress Recognition acknowledges credible advancement.
- Reassurance reduces unnecessary shame or alarm.
- Gentle Accountability keeps attention on the signal without moralizing.
- Course Correction redirects attention when the system has a stronger upstream insight.
- Signal vs Noise helps interpret what matters and what does not.
- Perspective broadens the user’s view without adding unnecessary noise.
- Restraint / Nothing Needs Fixing is the language of appropriate quiet.
- Transition supports movement between states, contexts, or times of day.
- Signature Foundational Flow Language refers to the distinct voice patterns that become part of the brand and relationship layer.

These are tools for clarity and trust, not extra coaching states.

---

## 9. Voice Entry Model

This is conceptual documentation only. No implementation types or code are being created here.

A voice-library entry may conceptually include fields such as:

- id
- coreLine
- communicationFamily
- purpose
- eligibleContexts
- requiredEvidence
- requiresHistory
- allowedCoachingStates
- tone
- intensity
- cooldown
- recentUseLimit
- doNotUseWhen
- variants

Conceptually, this model supports the following logic:

- A line has a specific communication purpose.
- It can only be used when the relevant context is active.
- It may require evidence thresholds or known history to be credible.
- It may be restricted to certain coaching states.
- It has an intensity and a style that can be tuned.
- It can be rate-limited to avoid repetition.
- It can be excluded from states or contexts where it would be inappropriate.

The point is not to create a clever voice engine. The point is to create a disciplined library that preserves credibility and avoids forcing language that the model does not yet support.

---

## 10. Signature Language — Seed Library

The following lines are canonical Foundational Flow lines and should be treated as high-value voice patterns, not generic filler language.

### “Nature collects receipts.”
Use for earned accountability or biological reflection after meaningful evidence exists. Do not use after one imperfect day.

This line is meant to communicate that the body keeps evidence over time. It is not a threat and not a moral judgment. It is a reflection on pattern consistency and biological reality.

### “Signal before noise.”
Use when redirecting attention toward the highest-value upstream signal.

It is a filtering principle, not a motivational slogan. It supports a discipline of prioritization rather than scattering attention across many competing issues.

### “Biology doesn’t punish. It reflects.”
Use to remove moral judgment from biological feedback.

This is a protective and clarifying line. It supports the idea that the system is describing information, not accusing the user of failing.

### “You can’t supplement your way out of a bad situation.”
Use when reinforcing upstream-before-downstream intervention logic.

This phrase is intended to make clear that maximizing downstream fixes cannot replace resolving upstream conditions. It should be used sparingly and only when the deeper logic actually applies.

### “Your biology is getting the message. Keep sending the signal.”
Use for meaningful progress recognition supported by evidence.

This is not a generic encouragement line. It is for times when the system has enough evidence to say a meaningful signal is being reinforced and the user is making credible progress.

### “One morning doesn’t erase the pattern you’ve built.”
Use as reassurance only when credible longitudinal history supports the statement.

This must be treated as a history-aware reassurance line, not a general comfort phrase. It should not be used when the user has no stable pattern to reference.

### “meatsuit”
This is optional high-personality/high-snark vocabulary that should be extremely rare and never used as routine health guidance.

It may appear in a very specific, intentionally humorous, non-clinical moment where the app is being lightly irreverent without becoming glib. It should not become a default tone device. It should never be used as a routine health instruction or as a way to diminish the user’s experience.

---

## 11. Today’s Perspective

Today’s Perspective is optional.

It should be sprinkled selectively into the experience when it genuinely adds:

- perspective
- grounding
- surprise
- connection
- brand voice

It should NOT appear on every NOW state.

When the screen already contains biologically meaningful contextual guidance, another perspective card may be unnecessary noise.

The purpose of Today’s Perspective is to add value without clutter. It should not become an additional layer of commentary on top of already meaningful guidance. It should not be used for filler or to raise the number of cards on screen.

Do not use handwritten/script/cutesy motivational presentation.

Use the established refined typography and visual system.

The voice layer should not look or feel like a motivational quote generator. It should feel like a clear, mature, reflective companion using the app’s existing design language.

---

## 12. Generated Language / LLM Guardrail

Future generated-language capability may vary phrasing but must never freestyle the biological claim.

An LLM may only phrase facts, intent, evidence boundaries, and causal boundaries supplied by authoritative upstream logic.

Generated language must not independently decide:

- what is biologically true
- why an outcome occurred
- what the primary target should be
- whether evidence is sufficient
- whether a signal advanced
- whether an intervention is eligible

The generated language can vary message structure, emphasis, and tone within the allowed boundaries, but it cannot invent or reinterpret the underlying model.

The system must preserve a strict separation between:

- authoritative personalization and biology
- optional language generation
- user-facing communication

If the upstream logic does not specify a fact or boundary, the language model must not manufacture one.

---

## 13. Example Contexts

The same coaching truth may be expressed differently depending on context.

### Example A: New user with little history

Coaching truth: The user has a meaningful morning-light gap and no strong evidence yet of a stable pattern.

Possible expression:

- “Your morning light timing looks like a meaningful opportunity, and it may be worth focusing on as your baseline becomes clearer.”

This keeps the language grounded in the current state without pretending a long-running pattern exists.

### Example B: User showing credible progress

Coaching truth: The user’s behavior is improving and there is meaningful evidence of change.

Possible expression:

- “Your biology is getting the message. Keep sending the signal.”

This is appropriate only when the evidence is strong enough to justify progress recognition.

### Example C: Established signal

Coaching truth: A signal is established and no longer needs active coaching.

Possible expression:

- “This is mostly in the background now. Nothing urgent needs fixing.”

This is quiet, respectful, and consistent with an established state.

### Example D: Disruption / travel

Coaching truth: The user is in a disrupted context, but the biological target remains the same.

Possible expression:

- “This week’s context is harder than ideal, but the objective is still the same: protect the light signal and stabilize the pattern as the environment allows.”

This preserves the target while acknowledging the disruption without blaming the user.

### Example E: Known constraint

Coaching truth: The ideal intervention conflicts with a real-world constraint.

Possible expression:

- “The ideal timing may not be realistic right now, but the biological goal remains the same. Focus on what is workable in this context.”

This respects the constraint without shaming the user.

These examples remain consistent with the app’s personalization rules and the idea that voice must not rewrite the model.

---

## 14. Initial Implementation Strategy

The Voice & Relationship Layer is documented now as a specification layer before implementation.

### Phase A
Curated static voice library of approximately 10–20 patterns.

This phase establishes a disciplined set of reusable lines with clear families, evidence requirements, and boundaries.

### Phase B
Context/history eligibility rules plus cooldown and repetition controls.

This phase ensures that lines are used only when appropriate and that the app does not overuse signature language.

### Phase C
Controlled variants.

Add a limited set of safe variants for the same line, preserving the authoritative core meaning while supporting different contexts.

### Phase D
More adaptive relationship behavior as credible longitudinal evidence grows.

Only after the foundation is strong should the app expand into optional personalization that becomes more history-aware and relationship-aware.

Important: NOW is the right time to document/specify this layer, not implement it.

This is specification work currently, not product behavior changes. The architecture should be fully defined before the implementation layer is added.

---

## 15. Non-Goals

The Voice Layer is NOT:

- a quote generator
- an inspirational-message system
- a chatbot personality pasted over the app
- a replacement for personalization
- a notification-frequency mechanism
- a source of biological conclusions
- gamification

The voice layer should support the user’s understanding, not create extra stimulation or fake engagement. It should clarify, not distract. It should add warmth, not noise.

---

## Existing Rules That Must Remain Consistent

The Voice Layer must preserve and not contradict these existing personalization principles:

- NEEDS_ATTENTION → DEVELOPING → ESTABLISHED
- Advancement requires sufficient evidence over time.
- A single Done/action must not establish a signal.
- DEVELOPING should reduce coaching intensity/frequency.
- ESTABLISHED remains in the model but should be mostly quiet.
- Constraint ≠ noncompliance.
- Silence is acceptable.
- Today’s Perspective is optional.
- The current primary coaching target does not automatically change because time of day changes.
- Do not introduce handwritten/cutesy motivational language.

These principles are not optional voice styling preferences. They are product and architecture constraints that the voice layer must respect.

---

## Summary

The Voice & Relationship Layer is the last downstream translation layer between authoritative personalization and the person. It determines how the app communicates, but it does not invent or redefine biology, evidence, or coaching priorities.

The goal is a communication system that feels human, grounded, and credible while staying disciplined enough not to overstate what the system knows. It should sound like Foundational Flow when the model is well-understood, and it should know when to be quiet.

This architecture should be treated as a product specification: a disciplined layer that provides clarity and tone without replacing the underlying biological intelligence.
