import Head from "next/head";
import Link from "next/link";
import { JourneyFrame, RhythmIcon } from "@/components/journey-design";

const biologicalDay = [
  ["sun", "Morning light", "sets the opening signal"],
  ["person", "Daytime activity", "reinforces the day"],
  ["food", "Meals and movement", "add timing information"],
  ["moon", "Darkness and sleep", "complete the rhythm"],
] as const;

const method = [
  ["01", "Listen", "Learn how your days actually work—not how an ideal schedule says they should."],
  ["02", "Prioritize", "Identify the signal creating the most useful place to begin."],
  ["03", "Guide", "Offer one realistic action at the time it can matter most."],
  ["04", "Adapt", "Use repeated evidence to adjust the coaching and become quieter as the pattern strengthens."],
] as const;

const experience = [
  ["Today", "Find your starting point", "Answer 16 focused questions about light, darkness, sleep timing, meals, movement, and the realities of your schedule."],
  ["Next", "Add the context that changes the answer", "Your wake time, bedtime, location, and daily structure help separate useful guidance from generic advice."],
  ["Each day", "See what matters now", "Receive one relevant action with a clear reason—or silence when nothing useful needs your attention."],
  ["Over time", "Build rhythm, not dependence", "As consistent evidence moves a signal from developing to established, the app earns the right to coach less."],
] as const;

export default function WelcomePage() {
  return <>
    <Head>
      <title>Foundational Flow — Circadian guidance for real life</title>
      <meta name="description" content="Personalized circadian guidance that helps your light, darkness, sleep, meals, movement, environment, and real life work together." />
    </Head>
    <JourneyFrame image={3} onboarding brandHomeHref="/">
      <main className="welcome-page">
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-hero-copy">
            <p className="journey-eyebrow">PERSONALIZED CIRCADIAN GUIDANCE</p>
            <h1 id="welcome-title">You may not need more health advice.<br/>You may need your signals to make sense.</h1>
            <p className="welcome-lead">If your sleep, energy, appetite, mood, or recovery feel inconsistent—even when you are trying to do the right things—the missing piece may not be effort. It may be timing and context.</p>
          </div>
        </section>

        <section className="welcome-reframe" aria-labelledby="welcome-reframe-title">
          <div className="welcome-section-copy">
            <p className="journey-eyebrow">THE BIOLOGICAL REFRAME</p>
            <h2 id="welcome-reframe-title">Your biology listens to timing—not just intention.</h2>
            <p>Your body is reading light, darkness, food, movement, temperature, and sleep as a continuous stream of information. Each signal tells your system what time it is and what it should prepare to do next.</p>
            <p>When those signals support one another, the day has a clearer rhythm. When they repeatedly disagree, your biology still adapts—but the result may not feel like the energy, sleep, or recovery you expected.</p>
          </div>
          <div className="welcome-dayline" aria-label="Signals across a biological day">
            {biologicalDay.map(([icon, title, text], index) => <article key={title}>
              <span className="welcome-day-number">0{index + 1}</span>
              <span className="welcome-signal-icon"><RhythmIcon kind={icon}/></span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </article>)}
          </div>
        </section>

        <section className="welcome-promise" aria-labelledby="welcome-promise-title">
          <p className="journey-eyebrow">WHAT FOUNDATIONAL FLOW DOES</p>
          <h2 id="welcome-promise-title">Find the signal creating the most friction—and start there.</h2>
          <p className="welcome-promise-lead">Foundational Flow does not hand everyone the same morning routine or demand a complete life overhaul. It learns your rhythm, respects your constraints, and turns the clearest evidence into one useful next step.</p>
          <ol className="welcome-method">
            {method.map(([number, title, text]) => <li key={number}>
              <span>{number}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>)}
          </ol>
        </section>

        <section className="welcome-experience" aria-labelledby="welcome-expect-title">
          <div className="welcome-section-copy">
            <p className="journey-eyebrow">WHAT THE EXPERIENCE FEELS LIKE</p>
            <h2 id="welcome-expect-title">A short beginning. Clear daily guidance. Less coaching as your rhythm becomes established.</h2>
          </div>
          <ol className="welcome-experience-path">
            {experience.map(([time, title, text]) => <li key={time}>
              <span>{time}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>)}
          </ol>
        </section>

        <section className="welcome-trust" aria-labelledby="welcome-trust-title">
          <div>
            <p className="journey-eyebrow">BUILT FOR REAL PEOPLE</p>
            <h2 id="welcome-trust-title">You are not a score to fix.</h2>
          </div>
          <div className="welcome-trust-copy">
            <p>No generic protocol. No perfect schedule. No daily pile of boxes designed to keep you busy.</p>
            <p>Your constraints are context—not noncompliance. If the biologically ideal option does not fit your life, the guidance adapts to the highest-value action you can realistically control.</p>
          </div>
        </section>

        <section className="welcome-close">
          <p className="journey-eyebrow">START WITH WHAT IS TRUE TODAY</p>
          <h2>Let’s find what matters most right now.</h2>
          <p>Sixteen questions give Foundational Flow enough evidence to stop guessing and begin with the signal most likely to help.</p>
          <Link href="/audit" className="journey-primary">Begin my assessment <span aria-hidden="true">→</span></Link>
        </section>
      </main>
    </JourneyFrame>
  </>;
}
