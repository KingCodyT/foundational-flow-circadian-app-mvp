# Delivery History + Cooldown Memory v1

## Purpose

Delivery memory exists to make Foundational Flow quieter after an interrupt has already been earned and delivered. It is a restraint layer, not a second coaching engine.

Pipeline:

Biology → Coaching Decision → Delivery Rules → Notification Orchestration → Delivery Memory → Runtime → Human

## Locked boundary

Delivery memory may suppress repetition. It may never create, upgrade, or intensify an intervention.

It does not decide:
- biological truth
- coaching target
- severity
- confidence
- coaching state
- intervention level
- notification eligibility

It only answers whether a previously approved interrupt is too repetitive to deliver again right now.

## Identity

v1 compares delivery slots using:
- channel
- target signal
- event

Unrelated signals or events do not suppress one another.

## Cooldown

v1 uses a configurable delivery cooldown with a 90-minute default. This is delivery hygiene, not a biological constant.

The default may be tuned later without changing biological or coaching logic.

## Material change escape hatch

A caller may provide a `materialChangeKey` representing an upstream-declared meaningful context change. When both the previous record and current delivery include keys and those keys differ, cooldown may be bypassed.

Delivery memory never invents material change. Missing keys do not manufacture a bypass.

## Runtime integration

The notification runtime may receive a memory decision. When memory says cooldown is active, runtime returns `NOOP / cooldown_active`.

Runtime still cannot schedule anything unless orchestration already approved delivery.

## Principle

The better Foundational Flow understands what it already said, the less often it should repeat itself.
