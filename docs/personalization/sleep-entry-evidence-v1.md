# Sleep timing entry and sensor evidence v1

## Product behavior

- Sleep anchors use explicit hour, minute, and AM/PM controls.
- Before saving, the app shows the interpreted bedtime-to-wake interval and duration.
- Identical bedtime and wake time is blocked. Intervals under 3 hours or over 16 hours get a quiet verification prompt and remain allowed when they reflect a person’s real schedule.
- A person’s entered timing is stored as `user_entered` evidence. It is direct evidence of the schedule they reported; it is not proof that sleep occurred or that a target was followed.
- Wearable sleep timing remains optional supporting context and cannot overwrite a user-entered schedule anchor.

## Consumer light-sensor boundary

Ambient-light readings from phones and consumer wearables are excluded from the wearable evidence categories. Device placement, orientation, coverage, spectral response, and the difference between wrist or pocket exposure and retinal exposure make them unsuitable for a precise circadian-dose score. They cannot independently change coaching guidance.

## Coaching behavior

These checks live inside existing profile and onboarding flows. They do not add a daily checklist, score, compliance judgment, or extra coaching target.
