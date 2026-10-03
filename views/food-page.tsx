import { MealNotificationSettings } from "@/components/meal-notifications";
import { FlowShell } from "@/components/flow-shell";
import { useCircadian } from "@/components/circadian-provider";
import { FoodGuidance } from "@/components/food-guidance";

export default function FoodPage() {
  const { dailyProfile, now, isHydrated } = useCircadian();
  return <FlowShell>
    <header className="journey-intro">
      <h1>Food</h1>
      <p>Find meal ideas that fit this part of your day. Choose your food preferences, explore alternatives, and see why each meal is suggested. No meal logging needed.</p>
    </header>
    <MealNotificationSettings />
    {isHydrated ? <FoodGuidance profile={dailyProfile} now={now} /> : <p role="status">Loading your meal ideas…</p>}
  </FlowShell>;
}
