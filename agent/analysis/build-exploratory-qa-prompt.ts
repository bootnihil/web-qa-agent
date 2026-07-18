import type { ClassifiedDiagnostics } from './classify-diagnostics';
import type { PageFinding } from './evaluate-page';
import type { ExtractedPageContent } from '../browser/extract-page-content';
import type { VisitedPageObservation } from '../browser/visit-approved-link';

export interface ExploratoryQaPromptInput {
  observation: VisitedPageObservation;
  content: ExtractedPageContent;
  classifiedDiagnostics: ClassifiedDiagnostics;
  ruleBasedFindings: PageFinding[];
}

export function buildExploratoryQaPrompt(
  input: ExploratoryQaPromptInput
): string {
  const {
    observation,
    content,
    classifiedDiagnostics,
    ruleBasedFindings
  } = input;

  const relevantFailedRequests =
    classifiedDiagnostics.failedRequests.filter(
      (item) =>
        item.disposition !== 'ignored-noise'
    );

  const evidence = {
    page: {
      requestedUrl: observation.requestedUrl,
      finalUrl: observation.finalUrl,
      httpStatus: observation.httpStatus,
      title: observation.title
    },

    content: {
      title: content.title,
      headings: content.headings,
      bodyText: content.bodyText,
      links: content.links,
      buttons: content.buttons
    },

    browserDiagnostics: {
      consoleErrors:
        classifiedDiagnostics.consoleErrors,

      failedRequests:
        relevantFailedRequests
    },

    ruleBasedFindings
  };

  return `
You are performing exploratory software QA review of a public commercial website.

Your job is to identify plausible user-facing QA issues using ONLY the evidence provided below.

IMPORTANT RULES:

1. Every finding must be grounded in specific supplied evidence.
2. Do not invent missing behavior, visual defects, broken interactions, or factual inaccuracies.
3. It is completely acceptable and preferred to return zero findings when the evidence does not support an issue.
4. Treat findings as candidate QA issues requiring appropriate verification, not automatically as confirmed defects.
5. Do not flag normal marketing language merely because it is subjective or promotional.
6. Do not report grammar or wording preferences unless there is a clear typo, malformed text, contradiction, placeholder content, or objectively confusing wording.
7. Do not claim that a link or button is broken unless the supplied evidence supports that conclusion.
8. Browser diagnostic entries already classified as ignored noise have been excluded and must not be inferred as issues.
9. Do not claim visual layout problems. No screenshot or visual evidence is being provided in this analysis.
10. Prefer a small number of strong, evidence-grounded findings over speculative observations.
11. Confidence should reflect the strength of the supplied evidence:
   - high: the evidence directly demonstrates the concern
   - medium: the evidence strongly suggests the concern but verification is still needed
   - low: the concern is plausible but requires significant further verification
12. Severity should reflect likely user impact, not how interesting the issue seems.

Allowed finding categories:
- content
- navigation
- interaction
- visual
- accessibility
- consistency
- technical
- other

Allowed severities:
- high
- medium
- low

Allowed confidence values:
- high
- medium
- low

Return ONLY valid JSON with this exact structure:

{
  "findings": [
    {
      "category": "content",
      "severity": "low",
      "confidence": "high",
      "title": "Concise finding title",
      "evidence": "Specific evidence from the supplied data",
      "reasoning": "Why this evidence may represent a QA issue",
      "suggestedCheck": "A concrete follow-up verification step"
    }
  ],
  "summary": "Concise summary of the exploratory QA review"
}

When there are no evidence-grounded candidate issues, return:

{
  "findings": [],
  "summary": "No evidence-grounded exploratory QA issues were identified."
}

PAGE EVIDENCE:

${JSON.stringify(evidence, null, 2)}
`.trim();
}
