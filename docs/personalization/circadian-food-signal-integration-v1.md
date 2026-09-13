# Circadian Food Signal Integration v1

## Purpose

This layer connects repeated Circadian Food Coaching observations to Foundational Flow's existing personalization and coaching architecture.

It does not create a second coaching engine.

Pipeline:

Food timing evidence → Food Timing snapshot → Food Coaching interpretation → existing Meal Timing signal → existing primary-target hierarchy → existing intervention/Voice/delivery pipeline.

## Behavior

- Insufficient or variable food timing remains silent.
- A repeated mismatch can contribute direct user-feedback evidence to the existing Meal Timing signal.
- If that signal was previously Established, undefined, or otherwise not active, repeated direct mismatch reopens it conservatively at Developing.
- If it is already Needs Attention, that state is preserved.
- Primary-target selection remains unchanged. Morning light, daytime light, evening light/darkness, and sleep timing retain their existing upstream priority over meal timing.
- Severity override logic remains unchanged.
- Food evidence does not independently create a notification, intervention level, or coaching message.

## Surfaces

NOW and YOU both use the same food-evidence-adjusted personalization state before primary-target selection. This keeps the daily coaching surface and the longitudinal foundation map consistent.

## Product principle

Food earns attention only after repeated direct evidence. Once it qualifies, it enters the same hierarchy as every other signal and may still remain quiet when a stronger upstream target deserves the microphone.
