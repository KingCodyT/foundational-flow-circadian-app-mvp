"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ProgressBar } from "@/components/progress-bar";
import { QuestionCard } from "@/components/question-card";
import { SectionHeading } from "@/components/section-heading";
import { useCircadian } from "@/components/circadian-provider";
import { categoryDefinitions, getQuestionsForCategory } from "@/lib/questionnaire";

export default function AuditPage() {
  const router = useRouter();
  const { answers, completeAudit, isHydrated, setAnswer } = useCircadian();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(false);

  const currentCategory = categoryDefinitions[currentIndex];
  const currentQuestions = getQuestionsForCategory(currentCategory.title);
  const isCurrentStepComplete = currentQuestions.every((question) => answers[question.id]);
  const isFinalStep = currentIndex === categoryDefinitions.length - 1;

  const handleNext = () => {
    if (!isCurrentStepComplete) {
      setShowValidation(true);
      return;
    }

    setShowValidation(false);

    if (isFinalStep) {
      completeAudit();
      router.push("/results");
      return;
    }

    setCurrentIndex((value) => value + 1);
  };

  if (!isHydrated) {
    return (
      <AppShell>
        <div className="py-20 text-[var(--color-muted)]">Loading your audit...</div>
      </AppShell>
    );
  }

  return (
    <AppShell eyebrow="Circadian Audit">
      <section className="grid gap-10 py-6 lg:grid-cols-[0.42fr_0.58fr] lg:py-10">
        <div className="space-y-8 lg:sticky lg:top-6 lg:self-start">
          <SectionHeading
            eyebrow={currentCategory.title}
            title={currentCategory.subtitle}
            description={currentCategory.intention}
          />
          <div className="rounded-[2rem] border border-[var(--color-line)] bg-white/70 p-6">
            <ProgressBar current={currentIndex + 1} total={categoryDefinitions.length} />
            <div className="mt-5 rounded-[1.5rem] bg-[var(--color-cream)]/75 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Current section
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]">
                Answer all prompts in this block, then move forward. You can revise earlier sections at any point before calculating results.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {categoryDefinitions.map((category, index) => (
                <div
                  key={category.title}
                  className={`rounded-2xl px-4 py-3 ${
                    index === currentIndex
                      ? "bg-[rgba(179,145,80,0.16)] ring-1 ring-[rgba(179,145,80,0.22)]"
                      : index < currentIndex
                        ? "bg-[rgba(31,28,24,0.06)]"
                        : "bg-[var(--color-cream)]/65"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{category.title}</p>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      {index < currentIndex
                        ? "Done"
                        : index === currentIndex
                          ? "Live"
                          : "Up next"}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-muted)]">{category.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-[var(--color-line)] bg-white/65 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                Section {currentIndex + 1} of {categoryDefinitions.length}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                We’re scoring this category for signal quality, consistency, and rhythm support.
              </p>
            </div>
          </div>
          {currentQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              selectedValue={answers[question.id]}
              onSelect={(value) => setAnswer(question.id, value)}
            />
          ))}

          {showValidation ? (
            <div className="rounded-[1.5rem] border border-[rgba(179,145,80,0.35)] bg-[rgba(179,145,80,0.12)] px-4 py-3 text-sm text-[var(--color-charcoal)]">
              Complete each question in this section before continuing.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => {
                setShowValidation(false);
                setCurrentIndex((value) => Math.max(0, value - 1));
              }}
              disabled={currentIndex === 0}
              className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-5 py-3 text-sm font-medium text-[var(--color-charcoal)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              Previous section
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-charcoal)] px-5 py-3 text-sm font-medium text-[var(--color-cream)] transition hover:bg-[var(--color-gold)] hover:text-[var(--color-charcoal)]"
            >
              {isFinalStep ? "Calculate results" : "Next section"}
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
