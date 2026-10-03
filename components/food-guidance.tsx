import { useState } from "react";
import Link from "next/link";
import { MealNudge } from "./meal-nudge";
import type { DailyProfile } from "@/types/circadian";
import { foodGuidancePhase } from "@/lib/personalization/food-guidance";
import { selectMealIdeas } from "@/lib/personalization/meal-ideas";
import { JourneyCard } from "./journey-design";

const guidance = {
  early: { title: "Build a balanced first meal", suggestion: "If you’re planning your first meal, include protein, a fiber-rich carbohydrate, and some unsaturated fat.", reason: "This is the early part of your usual waking day. A balanced meal is a practical starting point; there is no narrow protein window to hit." },
  daytime: { title: "Fuel the active part of your day", suggestion: "For your next meal, combine protein with vegetables, a fiber-rich carbohydrate, and unsaturated fat. Adjust the amount to your hunger and activity.", reason: "You’re between the early and wind-down parts of your saved schedule. This is a meal idea, not a prompt to eat when you aren’t hungry." },
  evening: { title: "Keep your next meal comfortable", suggestion: "If you’re hungry near bedtime, choose a meal or snack that satisfies you without feeling overly heavy. Protein, carbohydrates, and fats can all still fit.", reason: "Your usual bedtime is within about three hours. Small studies suggest very late large meals can affect overnight metabolism; this is not a rule to skip food or cut out carbohydrates." },
  general: { title: "A balanced option for your next meal", suggestion: "Choose a protein source, vegetables or fruit, a fiber-rich carbohydrate, and some unsaturated fat. Let hunger, activity, and your own needs guide the amount.", reason: "We’re keeping this guidance flexible because your schedule is missing, involves shift work, or you’re outside your usual waking hours. Clock time alone cannot tell us your biological phase." },
};
export function FoodGuidance({ profile, now }: { profile: DailyProfile | null; now: Date }) {
  const [choice, setChoice] = useState("omnivore");
  const [dairyFree, setDairyFree] = useState(false);
  const [quick, setQuick] = useState(false);
  const [offset, setOffset] = useState(0);
  const phase = foodGuidancePhase(profile, now);
  const content = guidance[phase];
  const { meals, total } = selectMealIdeas({phase, plantBased:choice === "plant", dairyFree, quick, offset});
  return <JourneyCard className="food-guidance">
    <section aria-label="Food for this part of your day">
      <h2>Food for this part of your day</h2>
      <p className="food-idea-note">{({early: "Early day · based on your saved schedule", daytime: "Daytime · based on your saved schedule", evening: "Near bedtime · based on your saved schedule", general: "General ideas · no timing adjustment"})[phase]}</p>
      <h3>{content.title}</h3>
      <p>{content.suggestion}</p>
      <p className="food-idea-note">Meal style and serving suggestions can change through your day. Protein, carbohydrate, and fat percentages are not calculated.</p>
      <div className="food-idea-controls">
        <label htmlFor="food-idea-preference">Food preference
          <select id="food-idea-preference" value={choice} onChange={event => { setChoice(event.target.value); setOffset(0); }}>
            <option value="omnivore">Omnivore</option><option value="plant">Plant-based</option>
          </select>
        </label>
        <label><input type="checkbox" checked={dairyFree} onChange={event => { setDairyFree(event.target.checked); setOffset(0); }}/> Dairy-free</label>
        <label><input type="checkbox" checked={quick} onChange={event => { setQuick(event.target.checked); setOffset(0); }}/> Quick options</label>
      </div>
      <p className="food-idea-note">{quick ? "Simple meals using cooked or ready-to-eat staples." : "Choose what sounds good; adjust portions to your hunger."} No meal logging needed.</p>
      <p className="sr-only" role="status">Showing {meals.length} {choice === "plant" ? "plant-based" : "omnivore"}{dairyFree ? ", dairy-free" : ""}{quick ? ", quick" : ""} meal ideas.</p>
      <div className="food-idea-grid">
        {meals.map(meal => <article key={`${phase}:${meal.id}`} className="food-idea">
          <h4>{meal.title}</h4>
          <p>{meal.ingredients}</p>
          <p><strong>Serving idea:</strong> {meal.portion}</p>
          <details><summary>Why this meal?</summary><p>{meal.why}</p></details>
          <details><summary>Nutrients & substitutions</summary>
            <p>{meal.preparation}</p>
            <dl><dt>Protein</dt><dd>{meal.protein}</dd><dt>Carbohydrates</dt><dd>{meal.carbs}</dd><dt>Fats</dt><dd>{meal.fats}</dd></dl>
            <p>{meal.swap}</p>
          </details>
        </article>)}
      </div>
      {total > 3 && <button type="button" className="journey-outline" onClick={() => setOffset(offset + 3)}>Show other ideas</button>}
      <p className="food-idea-note">Filters apply to these meal ideas only. Dairy-free isn’t an allergy guarantee; check ingredient labels.</p>
      {profile?.exercisePattern && profile.exercisePattern !== "none" && <p className="text-sm">On exercise days, adapt your meal size and timing to your session and hunger. Your saved exercise preference doesn’t tell us whether you trained today.</p>}
      <details className="timeline-disclosure">
        <summary>About food timing</summary>
        <p>{content.reason}</p>
        <p>Early-day ideas pair a protein source with breakfast foods. Daytime ideas use a full-meal format. Near-bedtime ideas offer smaller serving formats if you only need a snack. These are practical suggestions, not tested recipes for changing your metabolism.</p>
        <p>For comfort before sleep, avoid very large or heavy meals; a light snack can fit. <a href="https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits" target="_blank" rel="noreferrer" className="underline">NIH sleep guidance</a>. The three-hour display window is a planning aid, not a biological cutoff.</p>
        <p><strong>Carbohydrates:</strong> In controlled studies, glucose tolerance was generally better in the biological morning than evening. That does not establish a universal clock-time cutoff for carbohydrates. <a href="https://pubmed.ncbi.nlm.nih.gov/25870289/" target="_blank" rel="noreferrer" className="underline">Read the study</a>.</p>
        <p><strong>Protein:</strong> Include sources across your meals. Evidence for an optimal distribution is mixed, so we don’t assign a special protein hour. <a href="https://pubmed.ncbi.nlm.nih.gov/32429355/" target="_blank" rel="noreferrer" className="underline">Read the review</a>.</p>
        <p><strong>Fats:</strong> There is no established best hour for eating fats. A small late-dinner trial found changes in overnight glucose and fat metabolism, but it cannot prescribe an ideal fat schedule. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC7337187/" target="_blank" rel="noreferrer" className="underline">Read the trial</a>.</p>
        <p>These are general meal ideas, not a prescribed diet. Choose foods that fit your allergies and any dietary plan from your clinician.</p>
      </details>
    </section>
  </JourneyCard>;
}

export function FoodPreview({ profile, now, suppressNudge = false }: { profile: DailyProfile | null; now: Date; suppressNudge?: boolean }) {
  const content = guidance[foodGuidancePhase(profile, now)];
  return <JourneyCard className="food-guidance">
    <MealNudge profile={suppressNudge ? null : profile} now={now}>
    <h2>Food for your day</h2>
    <h3>{content.title}</h3>
    <p>{content.suggestion}</p>
    <Link href="/food" className="journey-outline inline-flex mt-4">Explore meal ideas</Link>
    </MealNudge>
  </JourneyCard>;
}
