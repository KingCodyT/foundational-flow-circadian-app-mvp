# Notification Persistence + App-State Integration v1

## Purpose

Persist notification runtime memory across refreshes and browser sessions without allowing persistence to become a biological or coaching decision layer.

Architecture:

`Biology → Coaching Decision → Delivery Rules → Orchestration → Runtime → Persistent Memory → Restraint`

Persistence remembers what the runtime scheduled or delivered. It does not decide what deserves attention.

## Stored runtime state

The existing Foundational Flow local app state now includes:

- the currently scheduled notification, if any;
- delivered notification history;
- material-change keys used by cooldown memory.

The state is hydrated with the rest of the circadian provider and saved through the same browser-local storage boundary.

## Provider API

The circadian provider exposes runtime-facing methods to:

- set or clear the scheduled notification;
- record an actual delivery;
- set or clear a material-change key.

Recording a delivered notification also clears the matching scheduled record.

## Safe pruning

Persistence performs bounded housekeeping only:

- scheduled runtime artifacts older than 24 hours are removed;
- delivered history older than 30 days is removed;
- delivered history is capped at 100 records;
- malformed timestamps are ignored rather than treated as valid evidence.

These windows are storage/runtime housekeeping limits, not biological cooldown rules. They do not change intervention eligibility, target selection, severity, confidence, or coaching state.

## Boundaries

Persistence must never:

- select or change the coaching target;
- upgrade an intervention level;
- infer biological relevance;
- author notification language;
- manufacture material-change keys;
- treat permission or storage state as biological evidence;
- convert old history into a negative behavioral signal.

Memory may make Foundational Flow quieter. It may never make it louder.

## Reset behavior

A full app reset clears notification persistence together with the rest of the local user state.

## Future transport

This layer intentionally does not implement background push or native scheduling. It creates the durable app-state boundary that a future service-worker, web-push, or native notification transport can consume.
