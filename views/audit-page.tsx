"use client";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { FlowShell } from "@/components/flow-shell";
import { ProgressBar } from "@/components/progress-bar";
import { QuestionCard } from "@/components/question-card";
import { SectionHeading } from "@/components/section-heading";
import { useCircadian } from "@/components/circadian-provider";
import { categoryDefinitions, questionnaire } from "@/lib/questionnaire";

export default function AuditPage() {
  const router = useRouter();
  const { answers, isHydrated, setAnswer } = useCircadian();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const currentQuestion = questionnaire[currentIndex];
  const currentCategory = categoryDefinitions.find((category) => category.title === currentQuestion.category)!;
  const isCurrentStepComplete = Boolean(answers[currentQuestion.id]);
  const isFinalStep = currentIndex === questionnaire.length - 1;

  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [currentIndex]);

  function handleNext() {
    if (!isCurrentStepComplete) return setShowValidation(true);
    setShowValidation(false);
    if (isFinalStep) return void router.push("/setup");
    setCurrentIndex((value) => value + 1);
  }

  if (!isHydrated) return <FlowShell><p role="status">Loading your assessment…</p></FlowShell>;

  return <FlowShell>
    <section className="grid gap-10 py-6 lg:grid-cols-[0.42fr_0.58fr] lg:py-10">
      <div className="space-y-8 lg:sticky lg:top-6 lg:self-start">
        <SectionHeading eyebrow={currentCategory.title} title="A clearer picture, one answer at a time." description={currentCategory.intention}/>
        <div className="rounded-[2rem] border border-[var(--color-line)] bg-white/70 p-6">
          <ProgressBar current={currentIndex + 1} total={questionnaire.length} label="Question"/>
          <div className="mt-5 rounded-[1.5rem] bg-[var(--color-cream)]/75 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Question {currentIndex + 1} of {questionnaire.length}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]">Choose the answer that best reflects real life. You can go back and revise any earlier answer.</p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/65 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Question {currentIndex + 1} of {questionnaire.length}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">These answers become the starting evidence for your personalization model.</p>
        </div>
        <QuestionCard question={currentQuestion} selectedValue={answers[currentQuestion.id]} onSelect={(value) => { setAnswer(currentQuestion.id, value); setShowValidation(false); }}/>
        {showValidation && <div role="alert" className="rounded-[1.5rem] border border-[rgba(179,145,80,0.35)] bg-[rgba(179,145,80,0.12)] px-4 py-3 text-sm text-[var(--color-charcoal)]">Choose an answer before continuing.</div>}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => { setShowValidation(false); setCurrentIndex((value) => Math.max(0, value - 1)); }} disabled={currentIndex === 0} className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-5 py-3 text-sm font-medium text-[var(--color-charcoal)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">Previous question</button>
          <button type="button" onClick={handleNext} className="inline-flex items-center justify-center rounded-full bg-[var(--color-charcoal)] px-5 py-3 text-sm font-medium text-[var(--color-cream)] transition hover:bg-[var(--color-gold)] hover:text-[var(--color-charcoal)]">{isFinalStep ? "Continue to profile setup" : "Next question"}</button>
        </div>
      </div>
    </section>
  </FlowShell>;
}
