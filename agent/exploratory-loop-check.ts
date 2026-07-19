import { chromium } from '@playwright/test';

import { extractPageContent } from './browser/extract-page-content';
import { runExploratoryLoop } from './planning/run-exploratory-loop';

async function main(): Promise<void> {
  console.log(
    'Running bounded autonomous exploratory planner loop...\n'
  );

  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage({
    viewport: {
      width: 1280,
      height: 720
    }
  });

  try {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Request a Demo</title>
        </head>

        <body>
          <main>
            <h1>Request a Demo</h1>

            <p>
              Complete the form below to learn more about our platform.
            </p>

            <label for="email">
              Work Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your work email"
              required
            />

            <label for="country">
              Country
            </label>

            <select
              id="country"
              name="country"
              required
            >
              <option value="">
                Please Select
              </option>

              <option value="Ecuador">
                Ecuador
              </option>

              <option value="Egypt">
                Egypt
              </option>

              <option value="Zimbabwe">
                Zimbabwe
              </option>

              <option value="Equador">
                Equador
              </option>
            </select>

            <button type="submit">
              Submit
            </button>
          </main>
        </body>
      </html>
    `);

    /*
     * Give the autonomous loop a small hard limit.
     *
     * This means Gemini can make at most four planning decisions,
     * regardless of what it wants to do.
     */
    const maxSteps = 4;

    const result =
      await runExploratoryLoop(
        page,
        'https://example.com/request-demo',
        maxSteps
      );

    console.log(
      '\nAutonomous exploratory loop completed.\n'
    );

    console.log(
      `Stop reason: ${result.stopReason}`
    );

    console.log(
      `Completed steps: ${result.completedSteps}/${result.maxSteps}`
    );

    console.log(
      '\nAction history:'
    );

    for (const step of result.steps) {
      console.log(
        `\nStep ${step.step}`
      );

      console.log(
        `Hypothesis: ${step.decision.hypothesis}`
      );

      console.log(
        `Reasoning: ${step.decision.reasoning}`
      );

      console.log(
        `Action: ${JSON.stringify(
          step.decision.action
        )}`
      );

      console.log(
        `Expected observation: ${step.decision.expectedObservation}`
      );

      console.log(
        `Execution status: ${step.executionResult.status}`
      );

      console.log(
        `Execution detail: ${step.executionResult.detail}`
      );
    }

    /*
     * Capture the final browser state after all autonomous decisions.
     */
    const finalObservation =
      await extractPageContent(page);

    console.log(
      '\nFinal observed form state:\n'
    );

    console.log(
      JSON.stringify(
        {
          textFields:
            finalObservation.textFields,

          selects:
            finalObservation.selects
        },
        null,
        2
      )
    );

    /*
     * Basic deterministic safety assertions.
     *
     * The schema already prevents unsupported action kinds, but these
     * assertions make the autonomous-loop check explicitly verify the
     * boundaries we care about.
     */
    if (
      result.completedSteps >
      maxSteps
    ) {
      throw new Error(
        `Loop exceeded hard step limit of ${maxSteps}.`
      );
    }

    if (
      result.completedSteps < 1
    ) {
      throw new Error(
        'Expected the exploratory loop to produce at least one planner decision.'
      );
    }

    const allowedActionKinds =
      new Set([
        'fill-text-field',
        'clear-field',
        'blur-field',
        'select-option',
        'scroll',
        'stop'
      ]);

    for (const step of result.steps) {
      if (
        !allowedActionKinds.has(
          step.decision.action.kind
        )
      ) {
        throw new Error(
          `Unexpected autonomous action: ${step.decision.action.kind}`
        );
      }
    }

    console.log(
      '\nAll bounded autonomous exploratory loop checks passed.'
    );

    console.log(
      '\nFlow proven:'
    );

    console.log(
      'Observe → Plan → Validate → Execute → Observe → Repeat'
    );
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(
    '\nAutonomous exploratory loop check failed.'
  );

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
