import { GoogleGenAI } from '@google/genai';
import { chromium } from '@playwright/test';
import { z } from 'zod';

const inspectNavigationArguments = z.object({
  reason: z.string().min(1)
});

const finishArguments = z.object({
  summary: z.string().min(1)
});

const inspectNavigationTool = {
  type: 'function',
  name: 'inspect_navigation',
  description:
    'Choose this when the Aidoc homepage should be explored further by inspecting its public navigation links.',
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Why inspecting the navigation is the best next QA action.'
      }
    },
    required: ['reason']
  }
};

const finishTool = {
  type: 'function',
  name: 'finish',
  description:
    'Choose this when the available homepage information is sufficient and no further exploration is needed.',
  parameters: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'A short summary explaining why the run should finish.'
      }
    },
    required: ['summary']
  }
};

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    await page.goto('https://www.aidoc.com/', {
      waitUntil: 'domcontentloaded'
    });

    const headings = await page.locator('h1, h2').allTextContents();

    const observations = {
      title: await page.title(),
      url: page.url(),
      headings: headings
        .map((heading) => heading.trim())
        .filter((heading) => heading.length > 0)
        .slice(0, 10)
    };

    console.log('Playwright observations:');
    console.log(JSON.stringify(observations, null, 2));

    const ai = new GoogleGenAI({});

    const interaction = await ai.interactions.create({
      model: 'gemini-3.5-flash',
      store: false,
      input: `
You are a cautious QA agent testing the public Aidoc commercial website.

Mission:
Decide whether the homepage navigation should be inspected as the next testing action.

Rules:
- Use only the supplied observations.
- Do not invent website behavior.
- Do not request form submission or destructive actions.
- Choose exactly one available function.

Homepage observations:
${JSON.stringify(observations, null, 2)}
`,
      tools: [inspectNavigationTool, finishTool],
      generation_config: {
        tool_choice: 'any',
        thinking_level: 'low'
      }
    });

    const functionCalls = interaction.steps.filter(
      (step) => step.type === 'function_call'
    );

    if (functionCalls.length !== 1) {
      throw new Error(
        `Expected exactly one agent decision, received ${functionCalls.length}.`
      );
    }

    const decision = functionCalls[0];

    if (decision.name === 'inspect_navigation') {
      const argumentsResult = inspectNavigationArguments.parse(
        decision.arguments
      );

      console.log('\nAgent decision: INSPECT NAVIGATION');
      console.log(`Reason: ${argumentsResult.reason}`);
      return;
    }

    if (decision.name === 'finish') {
      const argumentsResult = finishArguments.parse(decision.arguments);

      console.log('\nAgent decision: FINISH');
      console.log(`Summary: ${argumentsResult.summary}`);
      return;
    }

    throw new Error(`Unexpected agent function: ${decision.name}`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error('Agent decision failed:', error);
  process.exitCode = 1;
});
