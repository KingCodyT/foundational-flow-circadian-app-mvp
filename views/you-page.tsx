"use client";

import { LocationRequiredNotice } from "@/components/location-required-notice";
import Link from "next/link";
import { CodyDiscovery } from "@/components/cody-discovery";
import { WearableSettings } from "@/components/wearable-settings";
import FoodTimingHistory from "@/components/food-timing-history";
import { AssessmentDisclosure } from "@/components/assessment-disclosure";
import DailyProfileForm from "@/components/todays-flow/daily-profile-form";
import ParticipationSelector from "@/components/todays-flow/participation-selector";
import { formatTimeInZone } from "@/lib/live-clock";
import { FlowShell } from "@/components/flow-shell";
import { useCircadian } from "@/components/circadian-provider";
import { profileProgress } from "@/lib/profile-progress";

function formatProfileTime(value?: string | null) {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return "Not set";
  const [hour, minute] = value.split(":").map(Number);
  // Saved schedule values are wall-clock times, not instants. A fixed UTC
  // anchor preserves them through locale formatting without device/DST shifts.
  return formatTimeInZone(new Date(Date.UTC(2000, 0, 1, hour, minute)), "UTC");
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

export default function YouPage() {
  const {
    dailyProfile,
    participationLevel,
    isHydrated,
    hasCompletedAudit,
    setDailyProfile,
    eventStateByDate,
    now, answers, environment,
  } = useCircadian();

  const profileTimeZone = dailyProfile?.timeZone ?? null;

  const progress = profileProgress(eventStateByDate, now, profileTimeZone);

  if (!isHydrated) return <FlowShell><p role="status">Loading your profile…</p></FlowShell>;

  return <FlowShell>
    <section className="profile-page">
      <header className="profile-intro">
        <p className="journey-eyebrow">PROFILE</p><h1>Your Profile</h1>
        <p>Your saved details and the guidance you choose.</p>
      </header>
      <LocationRequiredNotice profile={dailyProfile} onProfile />
      <section id="your-schedule" className="profile-section" aria-labelledby="schedule-heading">
        <h2 id="schedule-heading">Your Schedule</h2>
        <div className="profile-facts">
          <ProfileFact label="Wake" value={formatProfileTime(dailyProfile?.wakeTime)} />
          <ProfileFact label="Bedtime" value={formatProfileTime(dailyProfile?.targetBedtime)} />
          <ProfileFact label="Usual last meal" value={formatProfileTime(dailyProfile?.lastMealTime)} />
          <ProfileFact label="Timezone" value={dailyProfile?.timeZone ?? "Not set"} />
        </div>
        <details className="profile-disclosure" open><summary>Edit your schedule</summary><DailyProfileForm section="schedule" />
          <div className="profile-facts">
            <ProfileFact label="Sunrise today" value={formatSolarTime(environment.sunrise, profileTimeZone)} />
            <ProfileFact label="Sunset today" value={formatSolarTime(environment.sunset, profileTimeZone)} />
            <ProfileFact label="Day length today" value={formatDayLength(environment.dayLengthMinutes)} />
          </div>
          <p>{!environment.locationAvailable ? "Location is unavailable; solar timing is less personalized." : environment.dayLengthMinutes === 1440 ? "Continuous daylight today; no sunrise or sunset." : environment.dayLengthMinutes === 0 ? "The sun stays below the horizon today." : "Today’s solar timing uses your saved location."}</p>
        </details>
      </section>
      <section className="profile-section" aria-labelledby="preferences-heading">
        <h2 id="preferences-heading">Coaching Preferences</h2>
        <p className="profile-summary">Reminders {dailyProfile?.remindersEnabled ? "enabled in your preferences" : "off"}. Guidance is available in the app.</p>
        <details className="profile-disclosure"><summary>Manage coaching preferences</summary>
          <ParticipationSelector />
          {dailyProfile && <label className="profile-toggle"><input type="checkbox" checked={dailyProfile.showPerspective !== false} onChange={event => setDailyProfile({ ...dailyProfile, showPerspective: event.target.checked })}/>Show Today’s Perspective when relevant</label>}
          <DailyProfileForm section="preferences" />
        </details>
      </section>
      <section className="profile-section" aria-labelledby="assessment-heading">
        <h2 id="assessment-heading">Your Assessment</h2>
        <AssessmentDisclosure answers={answers} />
        {hasCompletedAudit && <details className="profile-disclosure profile-secondary"><summary>Retake options</summary>
          <p>Retaking opens the existing setup flow. Continuing through it can update your saved details and assessment.</p>
          <Link href="/audit" className="profile-text-link">Retake assessment</Link>
        </details>}
      </section>
      <section className="profile-section" aria-labelledby="history-heading">
        <h2 id="history-heading">Your History</h2>
        <p className="profile-summary">Recorded moments and their saved context.</p>
        <Link href="/timeline" className="profile-text-link">Open Timeline</Link>
        <details className="profile-disclosure"><summary>More history options</summary>
          {progress.length > 0 && <div><h3>Observations across days</h3>{progress.map(observation => <p key={observation}>{observation}</p>)}</div>}
          <FoodTimingHistory />
        </details>
      </section>
      <WearableSettings />
      <section className="profile-section" aria-labelledby="about-flow-heading">
        <h2 id="about-flow-heading">About Circadian Flow</h2>
        <p>Created by Cody Oakland to help you ask why, understand your daily patterns, and make more informed choices for your life.</p>
        <CodyDiscovery />
      </section>
    </section>
  </FlowShell>;
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
