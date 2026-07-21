import {
  planNextAction
} from './planning/plan-next-action';

async function main(): Promise<void> {
  console.log(
    'Asking Gemini to handle a non-interactive candidate finding safely...\n'
  );

  const decision =
    await planNextAction({
      pageUrl:
        'https://example.com/platform',

      currentStep:
        1,

      maxSteps:
        3,

      history:
        [],

      candidateFindings: [
        {
          category:
            'content',

          severity:
            'low',

          confidence:
            'high',

          title:
            'Possible typo in body text',

          evidence:
            'The page text contains the duplicated phrase "clinical clinical workflow".',

          reasoning:
            'The duplicated adjacent word appears to be a content error and is directly observable in the extracted page text.',

          suggestedCheck:
            'Confirm the duplicated wording in the rendered page content.',

          evidenceTarget:
            null
        }
      ],

      pageContent: {
        title:
          'Clinical AI Platform',

        headings: [
          'Clinical AI Platform',
          'Built for Enterprise Scale'
        ],

        bodyText:
          'Our clinical clinical workflow platform helps healthcare teams coordinate care across the enterprise.',

        links:
          [],

        /*
         * This intentionally reproduces the tempting but irrelevant
         * cookie-control evidence from the real-site run.
         *
         * Buttons are evidence only and cannot be clicked by the
         * current safe action vocabulary.
         */
        buttons: [
          'Allow all',
          'Deny'
        ],

        /*
         * No editable form controls exist that could meaningfully
         * investigate the candidate content issue.
         */
        textFields:
          [],

        selects:
          []
      }
    });

  console.log(
    'Validated Gemini planner decision:\n'
  );

  console.log(
    JSON.stringify(
      decision,
      null,
      2
    )
  );

  console.log(
    '\nDecision passed plannerDecisionSchema validation.'
  );

  console.log(
    `Requested safe action: ${decision.action.kind}`
  );

  /*
   * This is the actual regression assertion.
   *
   * The candidate finding is already directly observable in the page
   * evidence, and none of the permitted interactive actions can add
   * meaningful evidence.
   *
   * The planner should therefore stop rather than drifting into an
   * unrelated cookie-banner test or meaningless scroll action.
   */
  if (
    decision.action.kind !==
    'stop'
  ) {
    throw new Error(
      `Expected planner to stop for a non-interactive content candidate, but it requested "${decision.action.kind}".`
    );
  }

  console.log(
    '\nPlanner correctly stopped instead of performing unrelated exploration.'
  );
}

main().catch(
  (error: unknown) => {
    console.error(
      '\nGemini planner decision check failed.'
    );

    if (
      error instanceof Error
    ) {
      console.error(
        error.message
      );
    } else {
      console.error(
        error
      );
    }

    process.exitCode =
      1;
  }
);
