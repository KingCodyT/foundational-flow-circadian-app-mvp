"use client";

import Link from "next/link";
import { useMemo } from "react";
import { WearableSettings } from "@/components/wearable-settings";
import FoodTimingHistory from "@/components/food-timing-history";
import DailyProfileForm from "@/components/todays-flow/daily-profile-form";
import ParticipationSelector from "@/components/todays-flow/participation-selector";
import { useLiveClock } from "@/hooks/use-live-clock";
import { formatTimeInZone, localDateKey } from "@/lib/live-clock";
import { FlowShell } from "@/components/flow-shell";
import { useCircadian } from "@/components/circadian-provider";
import { buildDerivedEnvironment } from "@/lib/personalization/derived-environment";
import { profileProgress } from "@/lib/profile-progress";

function formatProfileTime(value?: string | null, timeZone?: string | null) {
  if (!value) return "Not set";
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return formatTimeInZone(date, timeZone);
}

function formatSolarTime(value?: string | null, timeZone?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatTimeInZone(date, timeZone);
}

function formatDayLength(minutes?: number | null) {
  if (minutes == null) return "—";
  const roundedMinutes = Math.round(minutes);
  const hours = Math.floor(roundedMinutes / 60);
  const remainder = roundedMinutes % 60;
  return `${hours}h ${remainder}m`;
}

function participationLabel(value?: string | null) {
  if (value === "BASELINE") return "Baseline";
  if (value === "GUIDED_FLOW") return "Guided Flow";
  if (value === "FULL_FLOW") return "Full Flow";
  return "Not set";
}

export default function YouPage() {
  const {
    dailyProfile,
    participationLevel,
    isHydrated,
    hasCompletedAudit,
    setDailyProfile,
    eventStateByDate,
  } = useCircadian();

  const now = useLiveClock();
  const profileTimeZone = dailyProfile?.timeZone ?? null;
  const todayKey = localDateKey(now, profileTimeZone);

  const environment = useMemo(
    () => buildDerivedEnvironment({ profile: dailyProfile }),
    [dailyProfile, todayKey]
  );

  const progress = profileProgress(eventStateByDate, now, profileTimeZone);

  if (!isHydrated) {
    return (
      <FlowShell>
        <section className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">PROFILE</p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] sm:text-5xl">Learning your rhythm...</h1>
        </section>
      </FlowShell>
    );
  }

  return (
    <FlowShell>
      <section className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">PROFILE</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] sm:text-5xl">Your profile and preferences.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--color-muted)]">Review what Foundational Flow knows about your routine, update your settings, and choose how much guidance you want.</p>

        {dailyProfile && <label className="mt-6 flex items-center gap-3"><input type="checkbox" checked={dailyProfile.showPerspective !== false} onChange={event => setDailyProfile({ ...dailyProfile, showPerspective: event.target.checked })}/>Show Today’s Perspective when relevant</label>}
        <div className="mt-10 rounded-3xl border border-[var(--color-line)] bg-white/70 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">What we know about your routine</p>
          <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileFact label="Wake time" value={formatProfileTime(dailyProfile?.wakeTime, profileTimeZone)} />
            <ProfileFact label="Sleep window" value={formatProfileTime(dailyProfile?.targetBedtime, profileTimeZone)} />
            <ProfileFact label="Timezone" value={dailyProfile?.timeZone ?? "Not set"} />
            <ProfileFact label="Guidance preference" value={participationLabel(participationLevel)} />
            <ProfileFact label="Sunrise" value={formatSolarTime(environment.sunrise, profileTimeZone)} />
            <ProfileFact label="Sunset" value={formatSolarTime(environment.sunset, profileTimeZone)} />
            <ProfileFact label="Day length" value={formatDayLength(environment.dayLengthMinutes)} />
          </div>
          <p className="mt-6 border-t border-[var(--color-line)] pt-5 text-sm leading-6 text-[var(--color-muted)]">
            {environment.locationAvailable
              ? environment.dayLengthMinutes === 1440
                ? "Your location has continuous daylight today; there is no sunrise or sunset."
                : environment.dayLengthMinutes === 0
                ? "At your location, the sun stays below the horizon today."
                : "Location is available, so today’s solar timing can adapt to where you are."
              : "Location is not available yet, so solar timing is less personalized."}
          </p>
          <section id="your-schedule" className="mt-6 border-t border-[var(--color-line)] pt-5">
            <div className="mt-6 grid gap-8 lg:grid-cols-2">
              <DailyProfileForm />
              <ParticipationSelector />
            </div>
            <details className="mt-6"><summary>Meal history</summary><FoodTimingHistory /></details>
          </section>
          {hasCompletedAudit ? (
            <div className="mt-6 border-t border-[var(--color-line)] pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Assessment</p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Want to start over with a fresh setup? Retake assessment is separate from profile editing.</p>
              <Link href="/audit" className="mt-3 inline-flex rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-charcoal)] transition hover:border-[var(--color-charcoal)]">Retake assessment</Link>
            </div>
          ) : null}
        </div>

        <WearableSettings />

        {progress.length > 0 && <section aria-labelledby="profile-progress-heading" className="mt-6 rounded-3xl border border-[var(--color-line)] bg-white/60 p-6 sm:p-8">
          <h2 id="profile-progress-heading" className="text-2xl font-semibold">Progress across foundations</h2>
          {progress.map(observation => <p key={observation} className="mt-3 leading-7">{observation}</p>)}
        </section>}
      </section>
    </FlowShell>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
