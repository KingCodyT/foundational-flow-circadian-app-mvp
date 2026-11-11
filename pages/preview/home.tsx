import Head from 'next/head';
import { JourneyFrame } from '@/components/journey-design';
import { DayDashboard } from '@/components/day-dashboard';
import { SunlightNow } from '@/components/sunlight-now';
import { LightCheckIn } from '@/components/light-check-in';
import type { DailyProfile } from '@/types/circadian';

// Read-only design review. Never writes synthetic data to a visitor's profile.
const profile: DailyProfile = {displayName:'Alex',locationLabel:'Laguna Beach, California',latitude:33.54,longitude:-117.78,locationPermissionGranted:true,timeZone:'America/Los_Angeles',wakeTime:'07:00',targetBedtime:'22:00',workStructure:'daytime',foodPreference:'omnivore'};
const now = new Date('2026-11-11T19:30:00Z');
export default function HomePreview() {
 return <><Head><title>Your day | Home screen preview</title><meta name="robots" content="noindex,nofollow" /></Head><JourneyFrame image={7}><div className="today-reviewed today-dashboard"><header className="journey-intro today-intro"><p className="journey-eyebrow">TODAY</p><p className="today-date">Wednesday, November 11</p><h1>Good morning, Alex.</h1></header><main className="journey-content today-content"><DayDashboard profile={profile} now={now}><SunlightNow profile={profile} now={now}/></DayDashboard><details id="today-light-guide" className="today-supporting"><summary>More about today’s light</summary><LightCheckIn profile={profile} now={now}/></details><p className="today-focus-line">Design preview · Sample profile and fixed 11:30 AM reading. Your saved information is unchanged. Food and Timeline links open the existing app.</p></main></div></JourneyFrame></>;
}
