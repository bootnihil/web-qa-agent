import {
  exploratoryQaAnalysisSchema
} from './analysis/exploratory-qa-schema';

const validResponse = {
  findings: [
    {
      category: 'content',
      severity: 'low',
      confidence: 'high',
      title: 'Possible placeholder text',
      evidence:
        'The visible page text contains "Lorem ipsum".',
      reasoning:
        'Placeholder copy on a production page may indicate unfinished content.',
      suggestedCheck:
        'Open the page and confirm whether the text is intentionally published.'
    }
  ],
  summary:
    'One potential content-quality issue was identified.'
};

const emptyResponse = {
  findings: [],
  summary:
    'No evidence-grounded exploratory QA issues were identified.'
};

const invalidResponse = {
  findings: [
    {
      category: 'definitely-a-bug',
      severity: 'critical',
      confidence: 'absolutely',
      title: '',
      evidence: '',
      reasoning: '',
      suggestedCheck: ''
    }
  ],
  summary: ''
};

console.log('Valid response:');

const parsedValid =
  exploratoryQaAnalysisSchema.safeParse(
    validResponse
  );

console.log(
  JSON.stringify(
    parsedValid,
    null,
    2
  )
);

console.log('\nEmpty findings response:');

const parsedEmpty =
  exploratoryQaAnalysisSchema.safeParse(
    emptyResponse
  );

console.log(
  JSON.stringify(
    parsedEmpty,
    null,
    2
  )
);

console.log('\nInvalid response:');

const parsedInvalid =
  exploratoryQaAnalysisSchema.safeParse(
    invalidResponse
  );

console.log(
  JSON.stringify(
    parsedInvalid,
    null,
    2
  )
);

console.log('\nSummary:');
console.log(
  `Valid accepted: ${parsedValid.success}`
);
console.log(
  `Empty accepted: ${parsedEmpty.success}`
);
console.log(
  `Invalid rejected: ${!parsedInvalid.success}`
);
