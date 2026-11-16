export const SCENARIOS = [
  {
    id: 'school',
    icon: 'school',
    titleKey: 'scenarios.school.title',
    shortTitleKey: 'scenarios.school.shortTitle',
    summaryKey: 'scenarios.school.summary',
    roleTagKey: 'scenarios.school.roleTag',
    steps: [
      {
        id: 'whatHappens',
        titleKey: 'scenarios.school.steps.whatHappens.title',
        bodyKey: 'scenarios.school.steps.whatHappens.body',
        tipKey: 'scenarios.school.steps.whatHappens.tip',
      },
      {
        id: 'whoIsThere',
        titleKey: 'scenarios.school.steps.whoIsThere.title',
        bodyKey: 'scenarios.school.steps.whoIsThere.body',
        tipKey: 'scenarios.school.steps.whoIsThere.tip',
      },
      {
        id: 'howLong',
        titleKey: 'scenarios.school.steps.howLong.title',
        bodyKey: 'scenarios.school.steps.howLong.body',
        tipKey: 'scenarios.school.steps.howLong.tip',
      },
      {
        id: 'whatToBring',
        titleKey: 'scenarios.school.steps.whatToBring.title',
        bodyKey: 'scenarios.school.steps.whatToBring.body',
        itemsKey: 'scenarios.school.steps.whatToBring.items',
      },
    ],
    questions: [
      { id: 'school-q1', textKey: 'scenarios.school.questions.q1' },
      { id: 'school-q2', textKey: 'scenarios.school.questions.q2' },
      { id: 'school-q3', textKey: 'scenarios.school.questions.q3' },
      { id: 'school-q4', textKey: 'scenarios.school.questions.q4' },
      { id: 'school-q5', textKey: 'scenarios.school.questions.q5' },
    ],
    starterWords: [
      { id: 'school-w1', textKey: 'scenarios.school.words.w1' },
      { id: 'school-w2', textKey: 'scenarios.school.words.w2' },
      { id: 'school-w3', textKey: 'scenarios.school.words.w3' },
      { id: 'school-w4', textKey: 'scenarios.school.words.w4' },
    ],
  },
  {
    id: 'clinic',
    icon: 'clinic',
    titleKey: 'scenarios.clinic.title',
    shortTitleKey: 'scenarios.clinic.shortTitle',
    summaryKey: 'scenarios.clinic.summary',
    roleTagKey: 'scenarios.clinic.roleTag',
    disclaimerKey: 'scenarios.clinic.disclaimer',
    steps: [
      {
        id: 'whatHappens',
        titleKey: 'scenarios.clinic.steps.whatHappens.title',
        bodyKey: 'scenarios.clinic.steps.whatHappens.body',
        tipKey: 'scenarios.clinic.steps.whatHappens.tip',
      },
      {
        id: 'whoIsThere',
        titleKey: 'scenarios.clinic.steps.whoIsThere.title',
        bodyKey: 'scenarios.clinic.steps.whoIsThere.body',
        tipKey: 'scenarios.clinic.steps.whoIsThere.tip',
      },
      {
        id: 'howLong',
        titleKey: 'scenarios.clinic.steps.howLong.title',
        bodyKey: 'scenarios.clinic.steps.howLong.body',
        tipKey: 'scenarios.clinic.steps.howLong.tip',
      },
      {
        id: 'whatToBring',
        titleKey: 'scenarios.clinic.steps.whatToBring.title',
        bodyKey: 'scenarios.clinic.steps.whatToBring.body',
        itemsKey: 'scenarios.clinic.steps.whatToBring.items',
      },
    ],
    questions: [
      { id: 'clinic-q1', textKey: 'scenarios.clinic.questions.q1' },
      { id: 'clinic-q2', textKey: 'scenarios.clinic.questions.q2' },
      { id: 'clinic-q3', textKey: 'scenarios.clinic.questions.q3' },
      { id: 'clinic-q4', textKey: 'scenarios.clinic.questions.q4' },
      { id: 'clinic-q5', textKey: 'scenarios.clinic.questions.q5' },
    ],
    starterWords: [
      { id: 'clinic-w1', textKey: 'scenarios.clinic.words.w1' },
      { id: 'clinic-w2', textKey: 'scenarios.clinic.words.w2' },
      { id: 'clinic-w3', textKey: 'scenarios.clinic.words.w3' },
      { id: 'clinic-w4', textKey: 'scenarios.clinic.words.w4' },
    ],
  },
  {
    id: 'bank',
    icon: 'bank',
    titleKey: 'scenarios.bank.title',
    shortTitleKey: 'scenarios.bank.shortTitle',
    summaryKey: 'scenarios.bank.summary',
    roleTagKey: 'scenarios.bank.roleTag',
    steps: [
      {
        id: 'whatHappens',
        titleKey: 'scenarios.bank.steps.whatHappens.title',
        bodyKey: 'scenarios.bank.steps.whatHappens.body',
        tipKey: 'scenarios.bank.steps.whatHappens.tip',
      },
      {
        id: 'whoIsThere',
        titleKey: 'scenarios.bank.steps.whoIsThere.title',
        bodyKey: 'scenarios.bank.steps.whoIsThere.body',
        tipKey: 'scenarios.bank.steps.whoIsThere.tip',
      },
      {
        id: 'howLong',
        titleKey: 'scenarios.bank.steps.howLong.title',
        bodyKey: 'scenarios.bank.steps.howLong.body',
        tipKey: 'scenarios.bank.steps.howLong.tip',
      },
      {
        id: 'whatToBring',
        titleKey: 'scenarios.bank.steps.whatToBring.title',
        bodyKey: 'scenarios.bank.steps.whatToBring.body',
        itemsKey: 'scenarios.bank.steps.whatToBring.items',
      },
    ],
    questions: [
      { id: 'bank-q1', textKey: 'scenarios.bank.questions.q1' },
      { id: 'bank-q2', textKey: 'scenarios.bank.questions.q2' },
      { id: 'bank-q3', textKey: 'scenarios.bank.questions.q3' },
      { id: 'bank-q4', textKey: 'scenarios.bank.questions.q4' },
      { id: 'bank-q5', textKey: 'scenarios.bank.questions.q5' },
    ],
    starterWords: [
      { id: 'bank-w1', textKey: 'scenarios.bank.words.w1' },
      { id: 'bank-w2', textKey: 'scenarios.bank.words.w2' },
      { id: 'bank-w3', textKey: 'scenarios.bank.words.w3' },
      { id: 'bank-w4', textKey: 'scenarios.bank.words.w4' },
    ],
  },
];

export function getScenarioById(id) {
  return SCENARIOS.find((scenario) => scenario.id === id);
}
