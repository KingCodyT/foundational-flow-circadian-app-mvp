import { Question } from "@/types/circadian";

export function QuestionCard({
  question,
  selectedValue,
  onSelect,
}: {
  question: Question;
  selectedValue?: string;
  onSelect: (value: string) => void;
}) {
  return (
    <article className="rounded-[2rem] border border-[var(--color-line)] bg-white/82 p-6 shadow-[0_20px_60px_rgba(31,28,24,0.06)] backdrop-blur">
      <div className="space-y-5">
        <div className="space-y-3">
          <h3 className="text-xl font-medium leading-8">{question.prompt}</h3>
          {question.description ? (
            <p className="max-w-3xl text-sm leading-6 text-[var(--color-muted)]">
              {question.description}
            </p>
          ) : null}
        </div>
        <div className="grid gap-3">
          {question.options.map((option) => {
            const isSelected = option.value === selectedValue;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
                className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                  isSelected
                    ? "border-[var(--color-gold)] bg-[linear-gradient(135deg,rgba(179,145,80,0.16),rgba(255,255,255,0.9))] shadow-[0_10px_24px_rgba(179,145,80,0.12)]"
                    : "border-[var(--color-line)] bg-[var(--color-cream)]/45 hover:border-[var(--color-muted)] hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-medium">{option.label}</p>
                      {isSelected ? (
                        <span className="rounded-full bg-[var(--color-charcoal)] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--color-cream)]">
                          Selected
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm leading-6 text-[var(--color-muted)]">
                      {option.detail}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`mt-1 h-5 w-5 rounded-full border ${
                      isSelected
                        ? "border-[var(--color-gold)] bg-[var(--color-gold)]"
                        : "border-[var(--color-line)] bg-transparent"
                      }`}
                    />
                    <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      {option.score}/100
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}
