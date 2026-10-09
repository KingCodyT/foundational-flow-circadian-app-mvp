import type { AnswerMap } from "@/types/circadian";
import { questionnaire } from "@/lib/questionnaire";

// A presentation-only reader. Native disclosure never invokes provider actions.
export function AssessmentDisclosure({ answers }: { answers: AnswerMap }) {
  const saved = Object.entries(answers).filter(([, value]) => value != null && value !== "");
  return <details className="profile-disclosure assessment-disclosure">
    <summary>View saved answers</summary>
    <p>These are your currently saved assessment answers.</p>
    {saved.length ? <dl className="assessment-answers">{saved.map(([id, value]) => {
      const question = questionnaire.find(item => item.id === id);
      const label = question?.options.find(option => option.value === value)?.label ?? value;
      return <div key={id}><dt>{question?.prompt ?? `Saved field: ${id}`}</dt><dd>{label}</dd></div>;
    })}</dl> : <p>No saved assessment answers are available.</p>}
  </details>;
}
