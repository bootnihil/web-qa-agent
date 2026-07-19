import { chromium } from '@playwright/test';

import { executeAgentAction } from './browser/execute-agent-action';
import { extractPageContent } from './browser/extract-page-content';
import { planNextAction } from './planning/plan-next-action';

async function main(): Promise<void> {
  console.log(
    'Running one-step planner → Playwright → observation check...\n'
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
          <title>Contact Us</title>
        </head>

        <body>
          <main>
            <h1>Contact Us</h1>
            <h2>Request a Demo</h2>

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
     * Step 1: Observe the browser before the planner acts.
     */
    const before =
      await extractPageContent(page);

    console.log('Initial browser observation:\n');

    console.log(
      JSON.stringify(
        {
          textFields:
            before.textFields,

          selects:
            before.selects
        },
        null,
        2
      )
    );

    /*
     * Step 2: Let Gemini choose exactly one approved next action.
     */
    const decision =
      await planNextAction({
        pageUrl:
          'https://example.com/contact',

        pageContent: before,

        currentStep: 1,
        maxSteps: 6,

        history: [
          {
            step: 1,

            action: {
              kind: 'scroll',
              direction: 'down',
              viewportCount: 1
            },

            result:
              'Scrolled down by 1 viewport and discovered a contact form.'
          }
        ]
      });

    console.log(
      '\nValidated Gemini planner decision:\n'
    );

    console.log(
      JSON.stringify(
        decision,
        null,
        2
      )
    );

    /*
     * Step 3: Execute only the validated AgentAction through the
     * deterministic Playwright executor.
     */
    const executionResult =
      await executeAgentAction(
        page,
        decision.action
      );

    console.log(
      '\nDeterministic execution result:\n'
    );

    console.log(
      JSON.stringify(
        executionResult,
        null,
        2
      )
    );

    /*
     * Step 4: Observe the browser again.
     *
     * This is the feedback that a future autonomous loop will give
     * back to Gemini before asking it what to test next.
     */
    const after =
      await extractPageContent(page);

    console.log(
      '\nBrowser observation after action:\n'
    );

    console.log(
      JSON.stringify(
        {
          textFields:
            after.textFields,

          selects:
            after.selects
        },
        null,
        2
      )
    );

    console.log(
      '\nOne-step planner execution check completed successfully.'
    );

    console.log(
      '\nFlow proven:'
    );

    console.log(
      'Observe → Plan → Validate → Execute → Observe'
    );
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(
    '\nPlanner execution check failed.'
  );

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
