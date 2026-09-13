# Circadian Food Coaching v1

## Purpose

Circadian Food Coaching v1 turns repeated direct meal-timing observations into longitudinal interpretation that the existing Foundational Flow coaching architecture may consume.

It is not a second coaching engine.

Pipeline:

Food timing evidence → daily timing snapshots → longitudinal interpretation → existing signal/coaching architecture → existing intervention/voice/delivery pipeline.

## v1 restraint

A single unusual meal day does not create a mismatch. v1 requires at least three observed meal days before interpreting a longitudinal pattern, and at least two qualifying days before a repeated mismatch is surfaced as evidence.

The thresholds are internal interpretation guards, not universal client-facing prescriptions.

## Patterns

- `LATE_LAST_MEAL_PATTERN`: repeated direct meal evidence places the last meal within two hours of target sleep.
- `LATE_EATING_DAY_PATTERN`: repeated last meals occur after sunset and within two hours of target sleep. Sunset describes context; sunset alone does not create a mismatch.
- `ALIGNED_OR_VARIABLE`: enough observations exist, but no repeated v1 mismatch is present.
- `INSUFFICIENT_EVIDENCE`: remain quiet and keep learning.

First-meal timing remains observational in Food Engine v1. A delayed first meal does not create a coaching mismatch, is not treated as irregularity, and does not generate a breakfast recommendation.

## Non-goals

v1 does not:

- select the primary coaching target;
- set intervention level;
- generate notification eligibility;
- prescribe breakfast;
- prescribe fasting or an eating-window duration;
- score meals;
- infer calories, macros, composition, or food quality;
- treat `NOT_YET` or `EATING_LATER` as evidence that a meal occurred;
- treat sunset as a universal dinner cutoff;
- shame a late meal or recommend skipping food because an ideal window passed.

## Product rule

The Food Engine should earn the right to speak. Repeated evidence may make meal timing relevant to the existing coaching engine; isolated human life remains human life.
