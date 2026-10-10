import Head from "next/head";
import Link from "next/link";
import styles from "./welcome-page.module.css";

export default function WelcomePage() {
return <>
<Head><title>Foundational Flow | Make sense of your day</title><meta name="description" content="Understand the timing of your day and find a practical next step. Begin with 16 questions about your current habits." /></Head>
<div className={styles.homepage} aria-label="Foundational Flow homepage">
 <header className="ff-nav"><div className="ff-brand">Foundational Flow<span style={{ color: "var(--ff-gold)" }}>.</span></div><span className="ff-nav-note">A clearer path to feeling better.</span></header>
 <main>
  <section className="ff-hero" aria-label="Welcome">
   <div><div className="ff-eyebrow">Where biology meets real life</div><h1 id="ff-headline">Your days should feel<br /><em>like yours again.</em></h1><p className="ff-lead">Energy for the people you love. Focus for the work that matters. Evenings when you can finally unwind. That’s worth taking seriously.</p><p className="ff-intro">Foundational Flow helps you connect the dots between your daily habits, your body’s timing, and how you feel—so you can start changing what matters.</p></div>
   <figure style={{ margin: 0 }}><img className="ff-hero-photo" src="/images/coastal-hero-placeholder.jpg" width={1254} height={1254} alt="Warm early light over a quiet coastal path, textured green bluffs, and the ocean horizon." /><figcaption className="ff-scene-caption">More life in your everyday.</figcaption></figure>
  </section>
  <section id="ff-why" className="ff-section ff-two"><div><div className="ff-eyebrow">Why this deserves your attention</div><h2>Feeling off changes<br />more than your mood.</h2></div><div className="ff-copy"><p>When your days revolve around getting going, pushing through, and struggling to switch off, it takes up space that could belong to something better.</p><p>You may already be trying hard to take care of yourself. <strong>The missing piece may be how your habits fit together across the day.</strong></p><p>Light and darkness help set your body’s daily timing. Sleep, meals, and activity are part of that pattern. Foundational Flow brings those connections into view.</p></div></section>
  <section id="ff-how" className="ff-section ff-method"><div className="ff-eyebrow">How Foundational Flow helps</div><h2>Turn understanding<br />into something you can do.</h2><div className="ff-steps"><div className="ff-step"><div className="ff-number">01 / UNDERSTAND</div><h3>Start with your real life.</h3><p>Answer 16 questions, one at a time. Then add your schedule and environment so the app has the context behind your answers.</p></div><div className="ff-step"><div className="ff-number">02 / FOCUS</div><h3>See what matters now.</h3><p>Find a useful place to focus, understand why it matters, and get a step you can put into practice in your own day.</p></div><div className="ff-step"><div className="ff-number">03 / ADAPT</div><h3>Let the guidance evolve.</h3><p>As you share more about your day, the guidance can become more relevant. Keep building on what you learn as your life changes.</p></div></div><div className="ff-example"><span>In everyday terms</span><p>A difficult morning isn’t an isolated event. Your sleep schedule, morning light, and evening habits give the app context for a more useful next step.</p></div></section>
  <section className="ff-section ff-two"><div><div className="ff-eyebrow">Built around you</div><h2>A better day has to work<br />in your real life.</h2></div><div className="ff-copy"><p>Early shifts. Late nights. Family responsibilities. A routine that changes from week to week.</p><p>Those details matter. Foundational Flow uses your circumstances to help shape guidance you can actually use. <strong>You don’t need an ideal routine to begin.</strong></p></div></section>
  <section className="ff-start"><div className="ff-eyebrow">Your starting point</div><h2>Your everyday life is worth this.</h2><p>Give yourself a clearer starting point. Answer 16 questions about your current habits, then add your schedule so the guidance starts with you.</p><Link href="/audit" className="ff-cta">Begin your assessment <span aria-hidden="true">→</span></Link><div className="ff-detail">16 questions · One at a time</div></section>
 </main>
 <footer className="ff-footer"><span>Foundational Flow · Where biology meets real life</span><span>Educational guidance for daily habits. Not medical diagnosis or treatment.</span></footer>
</div>

</>;
}
