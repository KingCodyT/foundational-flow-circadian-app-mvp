import { FoodRecipes } from "@/components/food-recipes";
import { FoodRegionSettings } from "@/components/food-region-settings";
import { MealNotificationSettings } from "@/components/meal-notifications";
import { FlowShell } from "@/components/flow-shell";
import { useCircadian } from "@/components/circadian-provider";
import { FoodLearning } from "@/components/food-guidance";

export default function FoodPage() {
  const { dailyProfile, setDailyProfile, storageIssue, now, isHydrated } = useCircadian();
  return <FlowShell>
    <header className="journey-intro">
      <h1>Food</h1>
      <p>Real recipes for your waking day. Pick what fits, open the steps, and make it yours.</p>
    </header>
    {isHydrated ? <><FoodRecipes profile={dailyProfile} now={now} onPreferencesChange={changes => setDailyProfile({wakeTime:null,targetBedtime:null,locationPermissionGranted:false,...dailyProfile,...changes})} /><p role="status">{storageIssue ? "Your changes could not be saved. Please use the storage recovery message above." : "Food preferences are saved in this browser and used on Today."}</p></> : <p role="status">Loading your meal ideas…</p>}
    {isHydrated && <><details className="journey-card"><summary>Local produce & food timing</summary><p>Location is optional for recipes. Choose a growing region for seasonal context; a calendar cannot confirm today’s harvest.</p><FoodRegionSettings /><FoodLearning profile={dailyProfile} now={now}/></details><details className="journey-card"><summary>Meal reminder settings</summary><MealNotificationSettings /></details></>}
  </FlowShell>;
}
