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
      buttons: content.buttons,

      /*
       * Select controls are supplied separately so
       * relationships between options are preserved.
       */
      selects: content.selects
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

2. Do not invent missing behavior, visual defects, broken interactions, factual inaccuracies, deployment context, environment information, or release status.

3. Do not describe the page or issue as being on:
   - production
   - a production environment
   - a live site
   - a released site
   - a customer-facing deployment
   unless the supplied evidence explicitly establishes that fact.

4. When the evidence establishes only that text or behavior was observed on the inspected page, describe only what was observed.

GOOD:
"Placeholder content detected in visible page text."

NOT SUPPORTED:
"Placeholder content present on the production site."

5. Separate observation from inference.

The evidence field must describe what was directly observed.

The reasoning field may explain why the observation could represent a QA concern, but must not introduce unsupported facts.

6. When analyzing form controls such as select dropdowns, inspect the structured control data carefully.

Do not claim that one option replaces another when both options are present.

For example, when the same dropdown contains both:
- "Ecuador"
- "Equador"

the evidence supports saying that both entries are present and that "Equador" appears to be an additional misspelled option.

It does NOT support saying that "Ecuador" was replaced by "Equador".

7. When reporting a problem involving a form control, identify the control using its supplied label, name, or id whenever available.

8. Every finding MUST include an "evidenceTarget" field.

Use evidenceTarget only when the supplied structured evidence identifies a UI element precisely enough for automated evidence capture.

Currently, the only supported machine-readable evidence target is:

{
  "kind": "select-option",
  "controlLabel": "Visible label or null",
  "controlName": "HTML name attribute or null",
  "controlId": "HTML id attribute or null",
  "optionText": "Exact option text"
}

For a select-option target:

- Copy controlLabel, controlName, and controlId from the supplied structured select evidence.
- Do not invent values that are not supplied.
- Use null when a particular identifier is unavailable.
- optionText must exactly match the relevant option text in the supplied evidence.
- Use this target only when the finding concerns a specific option inside a specific select control.

Example:

If the evidence contains a Country select with both "Ecuador" and "Equador", a valid evidence target for the misspelled option is:

{
  "kind": "select-option",
  "controlLabel": "Country",
  "controlName": "country",
  "controlId": "country",
  "optionText": "Equador"
}

When the finding cannot be tied to a currently supported machine-readable UI target, return:

"evidenceTarget": null

Do NOT force an evidence target when the evidence does not support one.

9. It is completely acceptable and preferred to return zero findings when the evidence does not support an issue.

10. Treat findings as candidate QA issues requiring appropriate verification, not automatically as confirmed defects.

11. Do not flag normal marketing language merely because it is subjective or promotional.

12. Do not report grammar or wording preferences unless there is a clear typo, malformed text, contradiction, placeholder content, or objectively confusing wording.

13. Do not claim that a link or button is broken unless the supplied evidence supports that conclusion.

14. Browser diagnostic entries already classified as ignored noise have been excluded and must not be inferred as issues.

15. Do not claim visual layout problems. No screenshot or visual evidence is being provided in this analysis.

16. Prefer a small number of strong, evidence-grounded findings over speculative observations.

17. Confidence should reflect the strength of the supplied evidence:
   - high: the evidence directly demonstrates the concern
   - medium: the evidence strongly suggests the concern but verification is still needed
   - low: the concern is plausible but requires significant further verification

18. Severity should reflect likely user impact, not how interesting the issue seems.

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
      "evidence": "Specific directly observed evidence from the supplied data",
      "reasoning": "Why the observed evidence may represent a QA issue, without adding unsupported facts",
      "suggestedCheck": "A concrete follow-up verification step",
      "evidenceTarget": {
        "kind": "select-option",
        "controlLabel": "Country",
        "controlName": "country",
        "controlId": "country",
        "optionText": "Equador"
      }
    }
  ],
  "summary": "Concise summary of the exploratory QA review"
}

For a finding with no supported machine-readable target, use:

{
  "category": "content",
  "severity": "low",
  "confidence": "high",
  "title": "Concise finding title",
  "evidence": "Specific directly observed evidence",
  "reasoning": "Why it may represent a QA issue",
  "suggestedCheck": "A concrete verification step",
  "evidenceTarget": null
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
