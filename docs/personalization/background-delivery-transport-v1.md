# Background Delivery Transport v1

## Purpose

This layer is the platform delivery boundary for Foundational Flow notifications that have already been approved by the biological, coaching, delivery, voice, orchestration, runtime, and persistence layers.

It exists to render an approved interrupt through the browser notification platform and report actual delivery back into app memory.

It does **not** decide whether a notification deserves to exist.

## Responsibilities

Background Delivery Transport v1:

- registers a dedicated service worker at `/ff-notification-sw.js`
- maps browser notification permission into the runtime permission model
- never prompts for permission automatically
- dispatches only persisted notifications whose approved `scheduledFor` time is due
- renders approved notifications with `ServiceWorkerRegistration.showNotification()`
- receives Web Push payloads through the service worker `push` event
- returns actual delivery records to the app through service-worker messaging
- routes notification taps back to `/now`
- preserves the existing delivery-history and cooldown loop

## Hard boundary

The transport must never:

- choose or change the active biological target
- upgrade an intervention level
- decide biological relevance or actionability
- author coaching language
- override orchestration suppression
- bypass cooldown or duplicate-delivery rules
- infer noncompliance from permission state

The transport may fail silently when the browser platform is unavailable. Platform failure is not biological evidence.

## Permission behavior

Service-worker registration is automatic when supported.

Notification permission requests are **not** automatic. `requestBrowserNotificationPermission()` is an explicit API for a future user-driven control. This avoids surprise prompts and keeps browser permission separate from biological decision-making.

## Delivery path

Current browser path:

`approved persisted notification -> transport bridge -> service worker -> browser notification -> delivered message -> persistent delivery history`

The service worker also supports a future server-originated Web Push path:

`push service -> service worker push event -> approved notification payload -> browser notification`

## Important limitation

A service worker cannot reliably wake itself at an arbitrary future local time simply because JavaScript asked it to do so. Browser timers and background tabs are not durable schedulers.

Therefore v1 does **not** pretend that future-dated browser-only notifications are guaranteed while the app is closed.

For durable future delivery while the app is closed, Foundational Flow still needs one of these platform schedulers:

1. server-side Web Push scheduling with stored subscriptions, or
2. a native mobile notification scheduler.

This v1 creates the browser transport contract both options can target without reopening the biological decision engine.

## Principle

**The transport delivers intelligence. It does not become intelligence.**
