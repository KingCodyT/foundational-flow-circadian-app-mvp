import Head from "next/head";
import Link from "next/link";
import { JourneyFrame, RhythmIcon } from "@/components/journey-design";

const signals = [
  ["sun", "Light", "When your day begins"],
  ["moon", "Darkness", "How your evening winds down"],
  ["clock", "Timing", "When you sleep, eat, and move"],
  ["person", "Real life", "The constraints your plan must respect"],
] as const;

const steps = [
  ["01", "Tell us what is real", "Sixteen focused questions establish your starting point. No judgment and no perfect schedule required."],
  ["02", "Add your rhythm", "Your wake time, bedtime, location, and daily structure give the app the context a generic plan cannot."],
  ["03", "See what matters now", "Foundational Flow chooses one relevant action at a time and explains why it matters."],
  ["04", "Let the guidance adapt", "As your patterns become established, the coaching becomes quieter. The goal is rhythm—not dependence on an app."],
] as const;

export default function WelcomePage() {
  return <>
    <Head>
      <title>Foundational Flow — Circadian guidance for real life</title>
      <meta name="description" content="Personalized circadian guidance built from your light, darkness, sleep, food, movement, environment, and real-life constraints." />
    </Head>
    <JourneyFrame image={3} onboarding brandHomeHref="/">
      <main className="welcome-page">
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div>
            <p className="journey-eyebrow">WHERE BIOLOGY MEETS REAL LIFE</p>
            <h1 id="welcome-title">Your body is always responding.<br/>Let’s make the signals clearer.</h1>
            <p className="welcome-lead">Foundational Flow helps you understand how light, darkness, sleep, meals, movement, and your environment shape the way you feel—then turns that understanding into one useful next step.</p>
            <div className="welcome-actions">
              <Link href="/audit" className="journey-primary">Find what matters now <span aria-hidden="true">→</span></Link>
              <Link href="/today" className="welcome-return">I already have a profile</Link>
            </div>
            <p className="welcome-reassurance">16 questions · About 3 minutes · No wearable required</p>
          </div>
          <aside className="welcome-promise" aria-label="What to expect">
            <p className="welcome-promise-label">WHAT YOU WILL NOT GET</p>
            <p>No generic protocol. No score designed to make you feel broken. No daily pile of boxes to check.</p>
            <span/>
            <p className="welcome-promise-label">WHAT YOU WILL GET</p>
            <p>A clearer picture of your rhythm and guidance that works with the life you actually live.</p>
          </aside>
        </section>

        <section className="welcome-definition" aria-labelledby="welcome-what">
          <div className="welcome-section-copy">
            <p className="journey-eyebrow">WHAT FOUNDATIONAL FLOW IS</p>
            <h2 id="welcome-what">A personal guide to the signals beneath your day.</h2>
            <p>Energy, sleep, appetite, mood, and recovery do not happen in isolation. Your biology is reading the timing and pattern of your environment all day long. Foundational Flow helps you see those patterns without turning your life into a laboratory.</p>
          </div>
          <div className="welcome-signal-grid">
            {signals.map(([icon, title, text]) => <article key={title}>
              <span className="welcome-signal-icon"><RhythmIcon kind={icon}/></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>)}
          </div>
        </section>

        <section className="welcome-why" aria-labelledby="welcome-why">
          <div>
            <p className="journey-eyebrow">WHY IT WORKS</p>
            <h2 id="welcome-why">Better guidance begins with better context.</h2>
          </div>
          <p>The same advice cannot fit a parent, a shift worker, a frequent traveler, and someone with complete control of their schedule. The app first learns what your days actually look like. It then prioritizes the signal most likely to help, adapts around constraints, and watches for real evidence before changing direction.</p>
        </section>

        <section className="welcome-experience" aria-labelledby="welcome-expect">
          <div className="welcome-section-copy">
            <p className="journey-eyebrow">WHAT TO EXPECT</p>
            <h2 id="welcome-expect">A short beginning. An experience that gets smarter—and quieter.</h2>
          </div>
          <ol>
            {steps.map(([number, title, text]) => <li key={number}>
              <span>{number}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>)}
          </ol>
        </section>

        <section className="welcome-close">
          <p className="journey-eyebrow">START WITH WHAT IS TRUE TODAY</p>
          <h2>You do not need more random advice.<br/>You need to know what matters for you.</h2>
          <p>The first step is a 16-question assessment that gives Foundational Flow enough context to stop guessing.</p>
          <Link href="/audit" className="journey-primary">Begin my assessment <span aria-hidden="true">→</span></Link>
        </section>
      </main>
    </JourneyFrame>
  </>;
}
