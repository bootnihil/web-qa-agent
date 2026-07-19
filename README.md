# Web QA Agent

An experimental AI-assisted web QA agent built with **TypeScript, Playwright, and Gemini** for safe website exploration, evidence collection, exploratory QA reasoning, controlled browser interaction, and structured issue reporting.

The project explores a simple idea:

> **AI can reason creatively about what might be worth testing, while browser execution, permissions, and safety boundaries remain deterministic.**

Rather than relying only on predefined automated test cases, the agent is being designed to independently inspect websites, form testing hypotheses, request safe exploratory actions, observe the resulting browser state, gather supporting evidence, and present reviewable findings.

---

## What It Does

The agent currently supports:

- Opening configured public websites using Playwright.
- Restricting navigation to explicitly approved domains.
- Discovering safe internal navigation links.
- Using Gemini to choose representative pages to inspect.
- Tracking visited URLs to avoid repeatedly revisiting the same page.
- Performing bounded multi-page exploration.
- Extracting structured page content including:
  - page title
  - headings
  - visible body text
  - links
  - buttons
  - text fields
  - text-field types and attributes
  - text-field values
  - browser-native validation state
  - browser-native validation messages
  - select controls
  - select options
- Collecting browser diagnostics:
  - console errors
  - failed network requests
- Classifying failed requests as:
  - actionable
  - needs review
  - expected diagnostic noise
- Running deterministic page-health checks.
- Using Gemini for evidence-grounded exploratory QA analysis.
- Producing structured candidate findings containing:
  - category
  - severity
  - confidence
  - evidence
  - reasoning
  - suggested verification step
- Generating machine-readable evidence targets for supported UI elements.
- Capturing full-page screenshots when needed.
- Capturing focused evidence for supported UI findings.
- Defining a constrained, Zod-validated vocabulary of exploratory browser actions.
- Deterministically executing approved Playwright interactions including:
  - filling text fields
  - clearing text fields
  - blurring form controls
  - selecting options from native dropdowns
  - bounded scrolling
  - explicitly stopping exploration
- Rejecting unsupported or ambiguous browser interactions rather than guessing.
- Using Gemini to form a test hypothesis and choose exactly one approved next action.
- Maintaining exploratory action history between planning steps.
- Re-observing the browser after each action.
- Running a bounded autonomous exploratory loop:
  - observe
  - plan
  - validate
  - execute
  - observe again
  - repeat
- Enforcing a hard maximum number of autonomous planning steps.
- Generating both JSON and human-readable Markdown reports for the existing multi-page inspection workflow.

The project is intended to evolve into a reusable constrained autonomous exploratory testing agent rather than a collection of site-specific automated tests.

---

## Example: A Real Issue Found by the Agent

During a controlled exploratory run against the Aidoc public website, the agent inspected the **Solutions** page.

The agent:

1. Loaded the page with Playwright.
2. Extracted visible content and structured form controls.
3. Inspected the available options inside the `Country` dropdown.
4. Detected that the same dropdown contained both:
   - `Ecuador`
   - `Equador`
5. Gemini identified `Equador` as a likely additional misspelled country option.
6. The finding was returned with:
   - **Category:** Content
   - **Severity:** Low
   - **Confidence:** High
7. Gemini returned a machine-readable evidence target identifying the exact dropdown and option.
8. Playwright located the control, verified that `Equador` existed, selected it locally without submitting the form, and captured focused screenshot evidence.

The resulting finding was essentially:

> **Possible misspelling in country list**
>
> The Country dropdown contains both `Ecuador` and `Equador`. The presence of `Equador` alongside the correctly spelled `Ecuador` suggests a likely typographical or data-quality issue.

This demonstrates the evidence workflow:

```text
Explore
   ↓
Observe
   ↓
Extract structured evidence
   ↓
Reason about possible QA issues
   ↓
Return a machine-readable evidence target
   ↓
Verify the target with Playwright
   ↓
Capture focused evidence
   ↓
Generate a reviewable candidate finding
```

The important distinction is that Gemini did not directly control the browser.

The AI identified the likely issue and described where the evidence could be found. Playwright then deterministically verified and interacted with the approved target.

---

## Autonomous Exploratory Loop

The project now also contains the first working bounded autonomous planner/action loop.

In a synthetic browser test, the agent independently performed the following sequence:

```text
Observe required Work Email field
        ↓
Hypothesis:
Test malformed email validation
        ↓
Fill field with invalid-email-format
        ↓
Observe:
valid = false
validation message indicates malformed email
        ↓
Hypothesis:
Check behavior after losing focus
        ↓
Blur field
        ↓
Observe validation state again
        ↓
Hypothesis:
Check recovery from invalid to valid input
        ↓
Fill field with tester@example.com
        ↓
Observe:
valid = true
validation message cleared
        ↓
Hypothesis:
Continue exploring required Country field
        ↓
Select Ecuador
```

These steps were **not hardcoded as a predefined test case**.

At every iteration:

1. Playwright observed the current page state.
2. Gemini received the latest structured evidence plus previous action history.
3. Gemini formed a QA hypothesis.
4. Gemini requested exactly one action.
5. Zod validated the requested action.
6. The deterministic executor independently resolved and verified the target.
7. Playwright executed the approved operation.
8. The browser was observed again.
9. The resulting evidence was fed into the next planning step.

The loop ended because the configured maximum number of steps was reached.

This proves the core autonomous flow:

```text
Observe
   ↓
Plan
   ↓
Validate
   ↓
Execute
   ↓
Observe
   ↓
Repeat
```

The autonomous loop is currently validated against synthetic controlled pages and has not yet been integrated into unrestricted real-site exploration.

---

## Architecture

The project separates generic agent infrastructure from site-specific configuration.

```text
agent/
├── actions/
│   └── validated exploratory action schemas and safety contracts
│
├── ai/
│   └── Gemini request handling, retries, and timeouts
│
├── analysis/
│   ├── deterministic page evaluation
│   ├── diagnostic classification
│   ├── exploratory QA schemas
│   ├── evidence-grounded prompt construction
│   └── Gemini exploratory QA analysis
│
├── browser/
│   ├── navigation inspection
│   ├── safe page visits
│   ├── deterministic approved-action execution
│   ├── browser diagnostic collection
│   ├── structured page-content extraction
│   ├── text-field and validation-state observation
│   ├── full-page screenshot capture
│   └── targeted UI evidence capture
│
├── config/
│   ├── AI configuration
│   └── generic site configuration types
│
├── decisions/
│   └── AI-assisted navigation decisions
│
├── exploration/
│   └── visited-page tracking and URL normalization
│
├── planning/
│   ├── planner decision schema
│   ├── exploratory planner prompt
│   ├── Gemini next-action planning
│   └── bounded autonomous planner/action loop
│
├── reporting/
│   ├── report models
│   ├── JSON reports
│   └── Markdown reports
│
└── sites/
    ├── site registry
    └── individual site configurations
```

The goal is to keep the agent engine generic.

A website is represented primarily through configuration rather than hardcoded test logic.

For example:

```typescript
{
  id: 'aidoc',
  name: 'Aidoc commercial website',
  startUrl: 'https://www.aidoc.com/',
  allowedHosts: [
    'aidoc.com',
    'www.aidoc.com'
  ],
  maxPages: 5,
  maxAgentSteps: 6,
  allowFormSubmission: false
}
```

The intention is that additional ordinary public websites can be added without rewriting the core agent.

---

## Technology Stack

The project currently uses:

- **TypeScript**
- **Node.js**
- **Playwright**
- **Gemini API**
- **Zod**
- **GitHub Actions**

TypeScript is used throughout the agent architecture for:

- site configuration;
- browser observations;
- diagnostic evidence;
- AI response schemas;
- planner decisions;
- exploratory action contracts;
- execution results;
- action history;
- report models;
- machine-readable evidence targets.

Playwright handles deterministic browser execution.

Gemini is used for reasoning tasks where rigid predefined rules are less useful.

Zod validates structured AI outputs before they are accepted by the agent.

---

## Deterministic Safety vs AI Reasoning

The project deliberately separates two responsibilities.

### Deterministic safety controls

Code decides what the agent is allowed to do.

Current boundaries include:

- Only explicitly approved hosts may be visited.
- Arbitrary AI-generated URLs are not accepted.
- Exploration is bounded by page and step limits.
- Previously visited URLs are tracked.
- Form submission is disabled.
- Potentially destructive actions are not exposed to the AI.
- Arbitrary CSS selectors are not accepted from the AI.
- Arbitrary JavaScript execution is not exposed to the AI.
- Unsupported element types are rejected.
- Ambiguous element targets are rejected rather than guessed.
- Requested dropdown options must actually exist.
- Text entry is restricted to approved input types.
- Autonomous planner loops have a hard maximum step count.

Examples of current and planned actions:

```text
Open approved page        ✓
Follow approved link      ✓
Scroll                    ✓
Fill text field           ✓
Clear text field          ✓
Blur field                ✓
Select native option      ✓
Explicitly stop           ✓

Open accordion            planned
Switch tabs               planned
Open custom dropdown      planned
Open/close modal          planned
Hover                     planned

Submit contact form       ✗
Create account            ✗
Attempt login             ✗
Make purchase             ✗
Upload file               ✗
Delete or modify data     ✗
Trigger destructive API   ✗
Execute arbitrary JS      ✗
Provide arbitrary selector✗
```

### AI reasoning

Gemini is used for tasks such as:

- choosing representative pages to inspect;
- identifying suspicious or inconsistent content;
- detecting likely typos or placeholder content;
- reasoning about structured form controls;
- producing candidate QA findings;
- suggesting follow-up verification;
- identifying machine-readable evidence targets;
- forming exploratory test hypotheses;
- choosing the next useful safe action;
- deciding when further interaction may be unnecessary.

AI findings are treated as **candidate issues**, not automatically confirmed defects.

Every finding must be grounded in supplied evidence.

Returning zero findings is explicitly considered a valid result.

---

## Safe Exploratory Action Boundary

The planner may request only actions matching a constrained schema.

The currently implemented action vocabulary is:

```text
fill-text-field
clear-field
blur-field
select-option
scroll
stop
```

For example, the planner may request:

```json
{
  "kind": "fill-text-field",
  "target": {
    "label": "Work Email",
    "name": "email",
    "id": "email",
    "placeholder": "Enter your work email"
  },
  "value": "invalid-email-format"
}
```

The AI cannot instead return arbitrary Playwright code such as:

```javascript
page.locator('#whatever').click();
```

Nor can it invent unsupported actions such as:

```json
{
  "kind": "submit-form"
}
```

The action schema is validated with Zod before execution.

The deterministic Playwright executor then independently:

1. resolves the target using approved DOM attributes;
2. rejects ambiguous matches;
3. verifies that the element type supports the requested action;
4. verifies requested dropdown options where applicable;
5. performs the approved Playwright operation.

The boundary is:

```text
Gemini planner
      │
      │ requests one action
      ▼
PlannerDecision schema
      │
      ▼
AgentAction schema
      │
      ▼
Deterministic executor
      │
      │ resolves target
      │ verifies control type
      │ rejects ambiguity
      ▼
Playwright
      │
      ▼
Browser
```

Current executor safety behavior includes:

- text-entry actions reject unsupported controls such as checkboxes;
- native dropdown selection rejects nonexistent options;
- field lookup rejects ambiguous targets rather than choosing one arbitrarily;
- AI-provided CSS selectors are not supported;
- text-entry actions are limited to approved input types and textareas;
- `stop` performs no browser interaction.

---

## Planner Decisions

Each Gemini planner response must contain exactly:

```json
{
  "hypothesis": "What behavior or risk is being investigated",
  "reasoning": "Why the next action is useful based on current evidence",
  "action": {
    "...": "Exactly one approved action"
  },
  "expectedObservation": "What new evidence the action may reveal"
}
```

For example:

```json
{
  "hypothesis": "The Work Email field may reject malformed email addresses.",
  "reasoning": "The page contains an editable required email field, so malformed input is a safe way to investigate client-side format validation.",
  "action": {
    "kind": "fill-text-field",
    "target": {
      "label": "Work Email",
      "name": "email",
      "id": "email",
      "placeholder": "Enter your work email"
    },
    "value": "invalid-email-format"
  },
  "expectedObservation": "The browser validation state or message may change to indicate an invalid email format."
}
```

The planner is explicitly instructed to choose only the **next** action rather than attempting to describe an entire multi-step test.

This enables the next decision to depend on what actually happened.

---

## Planner Action History

Each completed exploratory step is summarized and provided to the planner on the next iteration.

For a text field, history may contain evidence such as:

```text
Filled approved text-entry control with 20 characters.
Observed value: "invalid-email-format".
Browser-valid: false.
Validation message: "Please include an '@'..."
aria-invalid: null.
```

The next planner invocation also receives the complete current structured page observation.

This allows Gemini to reason across steps rather than treating every action as an isolated prompt.

For example:

```text
Step 1
Test malformed email
        ↓
Result:
invalid
        ↓
Step 2
Blur field
        ↓
Result:
still invalid
        ↓
Step 3
Try valid email
        ↓
Result:
valid
        ↓
Step 4
Move to another control
```

The prompt explicitly instructs the planner to avoid repeating actions that have already produced the same evidence unless repetition is intentionally useful for comparison.

---

## Current Autonomous Loop

The generic bounded exploratory loop currently follows:

```text
Observe current browser state
        ↓
Build structured planner evidence
        ↓
Include previous action history
        ↓
Gemini forms test hypothesis
        ↓
Gemini requests one approved action
        ↓
Validate PlannerDecision
        ↓
Validate AgentAction
        ↓
Execute deterministically with Playwright
        ↓
Observe resulting browser state
        ↓
Summarize execution result
        ↓
Add result to planner history
        ↓
Repeat
```

The loop stops when:

```text
Gemini chooses stop
```

or:

```text
Configured maximum step count is reached
```

The hard step limit is enforced by TypeScript and cannot be overridden by the planner.

---

## Structured Page Observation

Gemini receives structured browser evidence rather than unrestricted raw HTML.

The current observation layer can include:

### Page information

```text
URL
title
headings
body text
buttons
links
```

### Text-field information

```text
element type
input type
label
name
id
placeholder
required
disabled
read-only
current local value
browser-native valid state
browser-native validation message
aria-invalid
```

Password values are not exposed to the reasoning layer.

### Native select information

```text
label
name
id
required
disabled
available options
selected option
```

This allows the planner to reason about actual browser state before and after each action.

---

## Evidence-Grounded Exploratory QA

The separate exploratory QA analysis layer receives a compact structured evidence package rather than raw HTML.

Depending on the page, this may include:

- requested URL;
- final URL;
- HTTP status;
- page title;
- headings;
- visible body text;
- links;
- buttons;
- text fields;
- field validation state;
- select controls;
- select options;
- relevant browser diagnostics;
- deterministic findings.

Known diagnostic noise is filtered out before exploratory AI analysis.

For example, requests involving:

```text
Cloudflare RUM telemetry
DoubleClick tracking
YouTube telemetry
```

can be preserved in raw evidence while being excluded from the AI's QA reasoning context.

The exploratory model is explicitly instructed to:

- use only supplied evidence;
- avoid unsupported assumptions;
- avoid inventing visual issues without visual evidence;
- distinguish observation from inference;
- avoid claiming broken behavior without evidence;
- prefer zero findings over speculative findings;
- treat results as candidate QA issues rather than confirmed defects.

---

## Structured AI Findings

Gemini must return validated structured JSON.

A candidate finding contains:

```json
{
  "category": "content",
  "severity": "low",
  "confidence": "high",
  "title": "Possible misspelling in country list",
  "evidence": "The Country dropdown contains both Ecuador and Equador.",
  "reasoning": "Equador appears to be an additional misspelled option.",
  "suggestedCheck": "Verify the intended country list and correct or remove the misspelled entry.",
  "evidenceTarget": {
    "kind": "select-option",
    "controlLabel": "Country",
    "controlName": "country",
    "controlId": "country",
    "optionText": "Equador"
  }
}
```

Responses are validated with Zod before being accepted.

Unsupported values, malformed objects, or unexpected structures are rejected.

---

## Machine-Readable Evidence Targets

Certain findings can contain a machine-readable `evidenceTarget`.

This allows the reasoning layer to communicate:

> I think there is an issue here, and this is the specific UI element that contains the evidence.

The first implemented evidence target is:

```text
select-option
```

Example:

```json
{
  "kind": "select-option",
  "controlLabel": "Country",
  "controlName": "country",
  "controlId": "country",
  "optionText": "Equador"
}
```

Playwright can then independently:

1. locate the exact select control;
2. verify that the option exists;
3. select the option locally;
4. scroll the control into view;
5. capture a focused screenshot.

The AI does not directly provide arbitrary selectors or execute browser commands.

Additional evidence-target types are planned.

---

## Browser Diagnostics

The agent collects:

- browser console errors;
- failed network requests.

Failed network requests are classified into:

```text
actionable
needs-review
ignored-noise
```

For example:

```text
Cloudflare RUM telemetry      → ignored-noise
DoubleClick tracking          → ignored-noise
YouTube telemetry             → ignored-noise
Failed main JavaScript bundle → actionable
Unknown failed image          → needs-review
```

Raw evidence is preserved even when classified as noise.

This allows the report to remain transparent while preventing known telemetry failures from being presented as user-facing bugs.

---

## Deterministic Findings

Traditional rule-based checks remain useful where expected behavior can be defined deterministically.

Current examples include:

- HTTP 4xx or 5xx responses;
- empty page title;
- missing primary headings;
- obvious error-page indicators.

AI analysis complements these checks rather than replacing them.

A typical report can therefore separate:

```text
Rule-based findings
Exploratory AI candidate findings
Actionable browser diagnostics
Diagnostics needing review
Ignored diagnostic noise
```

---

## Screenshot Evidence

The agent currently supports two screenshot modes.

### Full-page evidence

A full-page screenshot can be captured when a page contains something requiring investigation.

### Targeted evidence

For supported machine-readable targets, Playwright captures a focused screenshot of the relevant UI control.

For the `Equador` example:

```text
Identify suspicious option
        ↓
Return select-option evidence target
        ↓
Locate exact Country dropdown
        ↓
Verify Equador exists
        ↓
Select Equador locally
        ↓
Capture focused screenshot
```

Future evidence improvements may include structured comparison data alongside screenshots.

---

## Reports

Existing site-agent runs create a directory under:

```text
agent-results/<RUN-ID>/
```

For example:

```text
agent-results/
└── 2026-07-18T17-14-26-197Z/
    ├── report.json
    ├── report.md
    └── evidence/
        └── page-01-finding-01.png
```

Generated reports are intentionally excluded from Git.

The Markdown report contains:

- run metadata;
- inspected pages;
- navigation decisions;
- HTTP/page observations;
- headings;
- browser diagnostics;
- diagnostic classifications;
- rule-based findings;
- exploratory QA candidate findings;
- severity;
- confidence;
- supporting evidence;
- reasoning;
- suggested verification steps;
- screenshot paths.

The JSON report preserves the same information in machine-readable form.

The new autonomous planner/action history is not yet integrated into the main report format.

---

## Adding Another Website

Site-specific configuration lives under:

```text
agent/sites/
```

A new public website can be introduced by defining:

- a unique site ID;
- display name;
- starting URL;
- approved hosts;
- exploration limits;
- interaction permissions.

The site is then registered in the site registry.

The long-term goal is to make adding another ordinary public website close to a configuration-only task.

The project is not intended to guarantee compatibility with every website on the internet.

Sites involving:

- authentication;
- CAPTCHAs;
- aggressive anti-bot systems;
- unusual iframe structures;
- Shadow DOM;
- custom JavaScript controls;
- complex SPA state;
- infinite scrolling

may require additional generic tooling or site-specific adapters.

---

## Setup

### Requirements

- Node.js
- npm
- Playwright-compatible environment
- Gemini API key

Clone the repository:

```bash
git clone https://github.com/bootnihil/web-qa-agent.git
cd web-qa-agent
```

Install dependencies:

```bash
npm ci
```

Install Chromium for Playwright if needed:

```bash
npx playwright install chromium
```

Configure the Gemini API key as an environment variable.

On Windows:

```cmd
setx GEMINI_API_KEY "your-api-key"
```

Open a new terminal after using `setx`.

The API key must never be committed to the repository.

---

## Running Tests

Run the Playwright test suite:

```bash
npm test
```

The repository includes deterministic Playwright tests alongside the agent infrastructure.

---

## Running the Existing Site Agent

Run the configured Aidoc site:

```bash
npm run agent:run -- aidoc
```

The existing multi-page site agent performs bounded observation and exploratory QA analysis within configured site boundaries.

The autonomous planner/action loop is not yet integrated into this command.

---

## Development Checks

The repository contains focused development checks used to verify individual agent capabilities independently.

These include:

```text
Gemini SDK connectivity
Gemini API connectivity
safe navigation inspection
navigation decisions
approved-link visits
visited-page tracking
page evaluation
browser diagnostics
diagnostic classification
page-content extraction
text-field observation
browser-native validation observation
exploratory QA schema validation
exploratory prompt construction
AI exploratory QA analysis
screenshot capture
screenshot-trigger behavior
targeted UI evidence capture
real-site exploratory integration
safe exploratory action schema validation
deterministic exploratory action execution
planner decision schema validation
planner prompt construction
Gemini next-action planning
single-step planner execution
bounded autonomous exploratory planner loop
```

Relevant action checks:

```bash
npm run agent:action-schema-check
npm run agent:action-executor-check
```

Relevant planner checks:

```bash
npm run agent:planner-schema-check
npm run agent:planner-prompt-check
npm run agent:planner-decision-check
npm run agent:planner-execution-check
npm run agent:exploratory-loop-check
```

Some planner checks make real Gemini API calls.

The schema and prompt checks can be run without consuming Gemini API quota.

---

## GitHub Actions

The repository currently includes a deterministic Playwright CI workflow.

On pushes and pull requests to `main`, GitHub Actions:

```text
checks out the repository
        ↓
installs Node.js
        ↓
runs npm ci
        ↓
installs Playwright browsers
        ↓
runs the Playwright test suite
        ↓
uploads the Playwright report
```

A separate scheduled agent workflow is planned for autonomous exploratory runs.

That workflow will eventually:

- run on a schedule;
- use a protected `GEMINI_API_KEY` GitHub secret;
- execute configured website exploration;
- store JSON and Markdown reports;
- upload screenshot evidence as CI artifacts.

---

## Current Limitations

The project is actively being developed.

The agent does **not yet** perform unrestricted autonomous exploratory testing.

Current limitations include:

- The autonomous planner/action loop has so far been validated on controlled synthetic pages.
- The planner loop is not yet integrated into the main multi-page site agent.
- Autonomous action history is not yet included in JSON or Markdown reports.
- The planner currently observes browser-native validation state but not full visual styling changes.
- The planner may reason about possible visual feedback that the current observation layer cannot yet directly verify.
- Planner stopping behavior still needs tuning; the first autonomous test reached its hard step limit rather than choosing `stop`.
- Generic text-field boundary strategies are not yet systematically generated.
- Form submissions and backend-changing actions are intentionally disabled.
- The current safe action vocabulary is deliberately limited.
- Generic arbitrary clicking is intentionally unsupported.
- Custom JavaScript dropdowns are not yet supported by the generic `select-option` executor.
- Tabs, accordions, modals, and hover interactions are not yet supported.
- Only a small number of machine-readable evidence-target types are supported.
- Native browser dropdown popups are difficult to capture directly in headless mode.
- Visual AI analysis of screenshots is not yet part of the planner loop.
- Scheduled autonomous CI execution is not yet configured.
- Reports are not yet compared across runs.
- Findings are not yet automatically deduplicated between runs.
- The agent does not yet remember historical exploration state between scheduled runs.

The project is now best described as a:

> **Constrained autonomous exploratory web QA agent in active development, with deterministic browser safety boundaries and a working bounded AI planner/action loop.**

---

## Next Major Development Phase

The core planner/action loop now works in a controlled environment.

The implemented flow is:

```text
Observe
    ↓
Form test hypothesis
    ↓
Request one approved action
    ↓
Validate planner decision
    ↓
Validate action
    ↓
Execute deterministically
    ↓
Observe resulting state
    ↓
Record action history
    ↓
Reason again
    ↓
Repeat or stop
```

The next major milestone is to connect this loop to a **carefully controlled real public webpage**.

That requires combining:

```text
existing real-site navigation
        +
real structured page extraction
        +
safe planner/action loop
        +
site safety configuration
        +
hard action limits
        +
evidence capture
```

The first real-site autonomous run should remain deliberately conservative:

- one approved website;
- one approved page;
- no form submission;
- very small step limit;
- only currently supported actions;
- complete action history;
- deterministic browser safety boundaries.

Once that works reliably, the planner/action loop can be integrated into the broader multi-page agent.

---

## Planned Boundary and Validation Testing

Future exploratory capabilities are intended to include systematic safe checks involving:

- empty values;
- minimum lengths;
- maximum lengths;
- unusually long input;
- special characters;
- Unicode;
- leading whitespace;
- trailing whitespace;
- malformed email formats;
- valid-after-invalid recovery;
- unexpected but non-destructive input.

For public websites, these tests should avoid submitting forms or triggering backend-changing actions.

More aggressive testing could be enabled only when running against explicitly approved test environments.

---

## Roadmap

### Real-site autonomous exploration

Run the bounded planner/action loop against an explicitly approved real public page.

Verify:

```text
real page observation
→ safe hypothesis
→ approved interaction
→ real post-action observation
→ continued reasoning
```

### Integrate planner loop into site agent

Connect autonomous interaction to the existing multi-page exploration architecture.

### Planner history reporting

Add each autonomous step to JSON and Markdown reports:

```text
hypothesis
reasoning
requested action
execution result
before state
after state
expected observation
```

### Improve stopping behavior

Teach the planner to stop when:

- a hypothesis has been sufficiently tested;
- further actions would repeat existing evidence;
- no meaningful safe controls remain;
- remaining interactions are unlikely to add useful QA evidence.

### Safe interaction tools

Already implemented:

- fill text field;
- clear text field;
- blur field;
- select native dropdown option;
- bounded scroll;
- stop exploration.

Planned additions include:

- inspect richer validation state;
- open custom dropdown;
- expand accordion;
- switch tab;
- open and close modal;
- hover.

### Boundary testing strategies

Add reusable exploratory strategies for:

- strings;
- numeric fields;
- email fields;
- required fields;
- length limits;
- special characters;
- Unicode;
- whitespace.

### Richer evidence targets

Extend machine-readable evidence targets to include:

- text fields;
- validation messages;
- buttons;
- links;
- custom dropdowns;
- tabs;
- accordions;
- modals;
- page sections.

### Smarter targeted screenshots

Capture evidence that demonstrates the complete finding rather than only the affected control state.

### Deeper site exploration

Improve discovery beyond top-level navigation.

Build a richer map of:

```text
pages
interactive elements
forms
states
previously tested behaviors
```

### Scheduled monitoring

Run exploratory agent jobs through GitHub Actions or another CI environment.

Store reports and screenshot evidence as artifacts.

### Historical comparison

Compare runs to identify:

```text
new findings
unchanged findings
resolved findings
newly failing pages
```

### Finding deduplication

Avoid repeatedly reporting the same known issue across runs.

### Smarter reporting

Clearly separate:

```text
Confirmed objective failures
High-confidence candidate issues
Lower-confidence observations
Diagnostics requiring review
Ignored diagnostic noise
Autonomous exploratory action history
```

---

## Project Philosophy

Traditional automated testing works extremely well when expected behavior is known:

```text
Given X
When Y
Then Z
```

Exploratory testing addresses a different question:

> **What might be wrong here that nobody explicitly wrote a test for?**

This project explores how several approaches can complement one another:

```text
Deterministic automation
        +
Controlled browser exploration
        +
AI-assisted reasoning
        +
Autonomous test hypotheses
        +
Constrained exploratory actions
        +
Post-action observation
        +
Structured evidence
        +
Targeted verification
        +
Strict safety boundaries
```

The goal is not to replace deterministic automation with an LLM.

The goal is to build an agent that can independently investigate a website, form useful testing hypotheses, safely interact with approved UI elements, observe what actually happened, adapt its next action, notice potentially meaningful problems, gather useful evidence, and present findings for human review—without giving an AI model unrestricted control over browser actions.

---

## Status

**Experimental / active development**

The agent currently supports:

- bounded multi-page browser exploration;
- safe approved-domain navigation;
- structured page and form-control extraction;
- text-field and browser-validation-state observation;
- browser diagnostic collection and classification;
- deterministic page-health checks;
- evidence-grounded Gemini exploratory QA analysis;
- validated structured AI findings;
- machine-readable evidence targets;
- conditional screenshot evidence;
- targeted screenshot capture for supported UI elements;
- a constrained Zod-validated exploratory action vocabulary;
- deterministic Playwright execution of approved actions;
- rejection of unsupported and ambiguous action targets;
- Gemini-generated exploratory hypotheses;
- validated one-action-at-a-time planning;
- post-action browser observation;
- planner action history;
- bounded iterative autonomous exploration;
- hard planner step limits;
- JSON and Markdown reporting for the existing site-agent workflow.

The first bounded autonomous exploratory loop has been successfully demonstrated on a controlled browser page.

The next major development step is the first carefully constrained autonomous run against a real public webpage, followed by integration of the planner/action loop into the broader multi-page agent.