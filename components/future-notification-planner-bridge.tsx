"use client";

import { useEffect, useMemo } from "react";
import { FlowEvent } from "@/lib/flow-engine";
import { useCircadian } from "@/components/circadian-provider";
import { Day1PersonalizationResult } from "@/lib/personalization/day1";
import { DerivedEnvironment } from "@/lib/personalization/derived-environment";
import { planFutureNotification } from "@/lib/personalization/future-notification-planner";
import { SignalReconsideration } from "@/lib/personalization/reconsideration";

export function FutureNotificationPlannerBridge({
  day1,
  futureEvent,
  derivedEnvironment,
  reconsideration,
  now,
}: {
  day1: Day1PersonalizationResult;
  futureEvent?: FlowEvent | null;
  derivedEnvironment?: DerivedEnvironment | null;
  reconsideration?: Record<string, SignalReconsideration> | null;
  now: Date;
}) {
  const {
    isHydrated,
    notificationState,
    setScheduledNotification,
  } = useCircadian();

  const deliveredHistory = useMemo(
    () =>
      notificationState.deliveredNotifications.map((record) => ({
        channel: record.channel,
        targetSignalId: record.targetSignalId,
        eventId: record.eventId,
        deliveredAt: record.deliveredAt,
      })),
    [notificationState.deliveredNotifications],
  );

  const plan = useMemo(
    () =>
      planFutureNotification({
        day1,
        futureEvent,
        derivedEnvironment,
        reconsideration,
        delivered: deliveredHistory,
        now,
      }),
    [
      day1,
      deliveredHistory,
      derivedEnvironment,
      futureEvent,
      now,
      reconsideration,
    ],
  );

  useEffect(() => {
    if (!isHydrated) return;

    const current = notificationState.scheduledNotification;
    const planned = plan.notification;

    if (planned) {
      const samePlan =
        current?.id === planned.id &&
        current.scheduledFor === planned.scheduledFor &&
        current.title === planned.title &&
        current.body === planned.body;
      if (!samePlan) setScheduledNotification(planned);
      return;
    }

    // Planner owns only future:* records. Never clear an immediate/runtime
    // notification that another layer has already scheduled.
    if (current?.id.startsWith("future:")) {
      setScheduledNotification(null);
    }
  }, [
    isHydrated,
    notificationState.scheduledNotification,
    plan.notification,
    setScheduledNotification,
  ]);

  return null;
}

export default FutureNotificationPlannerBridge;
