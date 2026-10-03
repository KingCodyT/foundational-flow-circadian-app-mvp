import { LocationRequiredNotice } from "@/components/location-required-notice";
import { FoodRegionSettings } from "@/components/food-region-settings";
import { MealNotificationSettings } from "@/components/meal-notifications";
import { FlowShell } from "@/components/flow-shell";
import { useCircadian } from "@/components/circadian-provider";
import { FoodGuidance } from "@/components/food-guidance";

export default function FoodPage() {
  const { dailyProfile, setDailyProfile, storageIssue, now, isHydrated } = useCircadian();
  return <FlowShell>
    <header className="journey-intro">
      <h1>Food</h1>
      <p>Find meal ideas that fit this part of your day. Choose your food preferences, explore alternatives, and see why each meal is suggested. No meal logging needed.</p>
    </header>
    {isHydrated && <LocationRequiredNotice profile={dailyProfile} />}
    {isHydrated && <FoodRegionSettings />}
    <MealNotificationSettings />
    {isHydrated ? <><FoodGuidance profile={dailyProfile} now={now} onPreferencesChange={changes => setDailyProfile({wakeTime:null,targetBedtime:null,locationPermissionGranted:false,...dailyProfile,...changes})} /><p role="status">{storageIssue ? "Your changes could not be saved. Please use the storage recovery message above." : "Food preferences are saved in this browser and used on Today."}</p></> : <p role="status">Loading your meal ideas…</p>}
  </FlowShell>;
}
