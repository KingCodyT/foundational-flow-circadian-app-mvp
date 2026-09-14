# Notification Runtime Integration v1

## Purpose

Notification Runtime Integration is the execution boundary between an approved notification orchestration result and a platform-specific delivery adapter.

It does not decide biology, coaching importance, intervention level, or message content. Those decisions are already complete upstream.

## Locked sequence

Biology → Coaching Decision → Delivery Rules → Notification Orchestration → Runtime Integration → Platform Adapter → Human

## Responsibilities

Runtime Integration may:

- schedule an approved interrupt,
- cancel an interrupt when orchestration withdraws approval,
- prevent duplicate scheduling,
- prevent repeat delivery of the same signal/event pair,
- respect notification permission state,
- record actual delivery history.

Runtime Integration must not:

- upgrade a non-interrupting decision,
- invent notification copy,
- reinterpret coaching state,
- change target selection,
- change biological relevance,
- infer permission from biology,
- treat permission denial as noncompliance.

## Commands

The runtime planner emits one deterministic command:

- `SCHEDULE` — approved payload, permission granted, not already scheduled or delivered.
- `CANCEL` — a previously scheduled interrupt is now stale or no longer approved.
- `NOOP` — nothing useful should happen.

A stale scheduled notification is cancelled before any replacement can be scheduled. This keeps the runtime from delivering zombie guidance after the target, event, copy, or orchestration state changes.

## Delivery history

A delivery record is created only after the platform confirms delivery. Schedule time and delivery time are intentionally distinct.

The v1 deduplication boundary is conservative: the same signal/event/channel combination is not delivered twice once a delivery record exists.

Longer-term cooldown policy belongs above the platform adapter as a separate restraint/history layer, not inside the device transport.

## Platform boundary

This repository does not yet contain a durable background notification transport such as a native mobile scheduler or service-worker push pipeline. v1 therefore defines the deterministic runtime contract without pretending browser JavaScript can provide reliable background scheduling by itself.

The next implementation layer should bind these commands to the chosen platform transport while preserving this boundary unchanged.
