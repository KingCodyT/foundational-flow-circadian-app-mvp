import { questionnaire } from './questionnaire';
import { SIGNAL_REGISTRY } from './personalization/signal-registry';
import type { AnswerMap } from '@/types/circadian';
import { buildInitialPersonalizationState } from './personalization/initial-state';
export function focusReason(answers: AnswerMap, signalId: string) {
  const question = questionnaire.find(q => q.id === (SIGNAL_REGISTRY[signalId]?.questionId || signalId));
  const option = question?.options.find(o => o.value === answers[question.id]);
  return option ? `For ${(SIGNAL_REGISTRY[signalId]?.label || 'this habit').replace(/ Priority$/, '').toLowerCase()}, you reported: “${option.detail || option.label}” That helped choose this focus.` : 'Your assessment helped choose this focus. It stays selected as you practice.';
}
export function establishedReason(answers: AnswerMap, signalId: string, notes: string[] = []) {
  const initial = buildInitialPersonalizationState({answers}).perSignal[signalId];
  const practice = notes.some(n => n.startsWith('advanced_by_repeated_daily_evidence_') && n.endsWith('_to_ESTABLISHED'));
  const basis = practice ? 'Your logged practice moved this focus to established.' : initial?.coachingState === 'ESTABLISHED' ? 'Your assessment described this habit as already established.' : 'This focus is marked established in your saved coaching state.';
  return `${basis} Routine prompts for it are now off. This is a coaching stage, not a measured health improvement. You can keep practicing and choose a weekly in-app check-in for support.`;
}
