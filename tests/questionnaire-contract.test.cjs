const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = require('./load-typescript.cjs');

const { categoryDefinitions, questionnaire } = load('lib/questionnaire.ts');
const { SIGNAL_REGISTRY } = load('lib/personalization/signal-registry.ts');

test('assessment uses five evidence sections and does not ask for derived environmental facts', () => {
  assert.equal(questionnaire.length, 16);
  assert.equal(categoryDefinitions.length, 5);
  assert.deepEqual(
    categoryDefinitions.map((category) => category.title),
    ['Morning Light', 'Daytime Environment', 'Evening Light', 'Sleep Timing', 'Life Constraints'],
  );

  const ids = new Set(questionnaire.map((question) => question.id));
  assert.equal(ids.has('season_daylight'), false);
  assert.equal(ids.has('location_latitude'), false);
  assert.equal(SIGNAL_REGISTRY.season_daylight.questionId, undefined);
  assert.equal(SIGNAL_REGISTRY.location_latitude.questionId, undefined);
});

test('assessment keeps meal timing questions biologically distinct', () => {
  const regularity = questionnaire.find((question) => question.id === 'day_meal_regular');
  const lastMeal = questionnaire.find((question) => question.id === 'late_meals_stimulants');

  assert.match(regularity.prompt, /timing of your meals/i);
  assert.doesNotMatch(regularity.prompt, /activity/i);
  assert.match(lastMeal.prompt, /last meal relative to bedtime/i);
  assert.doesNotMatch(lastMeal.prompt, /alcohol|stimulants/i);
});

test('root route explains the experience before the assessment', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../pages/index.tsx'), 'utf8');
  assert.match(source, /views\/welcome-page/);
  const welcome = fs.readFileSync(path.resolve(__dirname, '../views/welcome-page.tsx'), 'utf8');
  assert.match(welcome, /WHAT FOUNDATIONAL FLOW IS/);
  assert.match(welcome, /WHY IT WORKS/);
  assert.match(welcome, /WHAT TO EXPECT/);
  assert.match(welcome, /href="\/audit"/);
});

test('assessment renders the questionnaire before profile setup', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../views/audit-page.tsx'), 'utf8');
  assert.match(source, /categoryDefinitions/);
  assert.match(source, /questionnaire\[currentIndex\]/);
  assert.match(source, /<QuestionCard/);
  assert.match(source, /Question \{currentIndex \+ 1\} of \{questionnaire\.length\}/);
  assert.match(source, /<ProgressBar[^>]+label="Question"/);
  assert.doesNotMatch(source, /currentQuestions\.map/);
  assert.doesNotMatch(source, /Next section|Previous section/);
  assert.match(source, /router\.push\("\/setup"\)/);
});
