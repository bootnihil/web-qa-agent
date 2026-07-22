import {
  readFile
} from 'node:fs/promises';

import {
  classifyDiagnostics
} from './analysis/classify-diagnostics';

import type {
  ExploratoryQaFinding
} from './analysis/exploratory-qa-schema';

import type {
  PageDiagnostics
} from './browser/collect-page-diagnostics';

import {
  buildSiteWideExploratoryFindings
} from './reporting/build-site-wide-exploratory-findings';

import type {
  InspectedPageResult,
  SiteAgentReport
} from './reporting/report-types';

import {
  writeJsonReport
} from './reporting/write-json-report';

import {
  writeMarkdownReport
} from './reporting/write-markdown-report';

function createCountryFinding(
  title: string,
  controlLabel: string | null,
  controlName: string | null
): ExploratoryQaFinding {
  return {
    category:
      'content',

    severity:
      'low',

    confidence:
      'high',

    title,

    evidence:
      'The country dropdown contains both "Ecuador" and "Equador".',

    reasoning:
      'Equador appears to be a misspelling of Ecuador.',

    suggestedCheck:
      'Confirm whether both options are selectable.',

    evidenceTarget: {
      kind:
        'select-option',

      controlLabel,

      controlName,

      controlId:
        null,

      optionText:
        'Equador'
    }
  };
}

function createPageResult(
  pageNumber: number,
  slug: string,
  title: string,
  finding: ExploratoryQaFinding
): InspectedPageResult {
  const pageUrl =
    `https://example.com/${slug}`;

  const diagnostics:
    PageDiagnostics = {
    consoleErrors: [],
    failedRequests: []
  };

  return {
    selection: {
      link: {
        text:
          title,

        url:
          pageUrl
      },

      reason:
        'Synthetic site-wide report check.'
    },

    observation: {
      requestedUrl:
        pageUrl,

      finalUrl:
        pageUrl,

      title,

      httpStatus:
        200,

      headings: [
        title
      ]
    },

    diagnostics,

    classifiedDiagnostics:
      classifyDiagnostics(
        diagnostics
      ),

    screenshotPath:
      `agent-results\\site-wide-report-check\\evidence\\page-${String(pageNumber).padStart(2, '0')}.png`,

    findings: [],

    exploratoryQaAnalysis: {
      findings: [
        finding
      ],

      summary:
        'A possible misspelled country option was identified.'
    },

    exploratoryInvestigation:
      null
  };
}

function countOccurrences(
  text: string,
  value: string
): number {
  return text
    .split(
      value
    )
    .length -
    1;
}

async function main(): Promise<void> {
  const inspectedPages:
    InspectedPageResult[] = [
      createPageResult(
        1,
        'radiology',
        'Radiology',
        createCountryFinding(
          'Misspelled country name in selection list',
          'COUNTRY*',
          'country'
        )
      ),

      createPageResult(
        2,
        'platform',
        'Platform',
        createCountryFinding(
          'Misspelled country name in registration form',
          'Country',
          'country'
        )
      ),

      createPageResult(
        3,
        'solutions',
        'Solutions',
        createCountryFinding(
          'Misspelled country option in form',
          null,
          'country'
        )
      )
    ];

  const siteWideExploratoryFindings =
    buildSiteWideExploratoryFindings(
      inspectedPages.map(
        pageResult => ({
          pageUrl:
            pageResult
              .observation
              .finalUrl,

          pageTitle:
            pageResult
              .observation
              .title,

          screenshotPath:
            pageResult
              .screenshotPath,

          findings:
            pageResult
              .exploratoryQaAnalysis
              .findings
        })
      )
    );

  const report:
    SiteAgentReport = {
    runId:
      'site-wide-report-check',

    startedAt:
      '2026-07-22T00:00:00.000Z',

    finishedAt:
      '2026-07-22T00:01:00.000Z',

    site: {
      id:
        'synthetic-site-wide',

      name:
        'Synthetic site-wide finding report',

      startUrl:
        'https://example.com/'
    },

    homepage: {
      requestedUrl:
        'https://example.com/',

      finalUrl:
        'https://example.com/',

      title:
        'Synthetic Homepage',

      httpStatus:
        200
    },

    outcome: {
      type:
        'completed',

      summary:
        'Completed synthetic site-wide finding report check.'
    },

    inspectedPages,

    siteWideExploratoryFindings,

    summary: {
      pagesInspected:
        inspectedPages.length,

      findingsCount:
        0,

      highestSeverity:
        'none',

      exploratoryQaFindingsCount:
        3,

      siteWideExploratoryFindingsCount:
        siteWideExploratoryFindings
          .length,

      highestExploratoryQaSeverity:
        'low',

      actionableDiagnosticsCount:
        0,

      diagnosticsNeedingReviewCount:
        0,

      ignoredDiagnosticNoiseCount:
        0
    }
  };

  const jsonReport =
    await writeJsonReport(
      report
    );

  const markdownReport =
    await writeMarkdownReport(
      report
    );

  const markdown =
    await readFile(
      markdownReport.filePath,
      'utf8'
    );

  if (
    siteWideExploratoryFindings.length !==
    1
  ) {
    throw new Error(
      `Expected 1 unique site-wide finding, received ${siteWideExploratoryFindings.length}.`
    );
  }

  if (
    siteWideExploratoryFindings[0]
      .occurrenceCount !==
    3
  ) {
    throw new Error(
      'Expected the site-wide finding to contain 3 occurrences.'
    );
  }

  if (
    !markdown.includes(
      '- Unique site-wide exploratory findings: 1'
    )
  ) {
    throw new Error(
      'Markdown summary does not contain the unique site-wide finding count.'
    );
  }

  if (
    !markdown.includes(
      '- Occurrences: 3'
    )
  ) {
    throw new Error(
      'Markdown report does not contain the expected occurrence count.'
    );
  }

  if (
    !markdown.includes(
      '- Affected pages: 3'
    )
  ) {
    throw new Error(
      'Markdown report does not contain the expected affected-page count.'
    );
  }

  if (
    !markdown.includes(
      '`target|content|select-option|country|equador`'
    )
  ) {
    throw new Error(
      'Markdown report does not contain the expected deterministic fingerprint.'
    );
  }

  if (
    countOccurrences(
      markdown,
      '### Exploratory QA Analysis'
    ) !==
    3
  ) {
    throw new Error(
      'The original page-level exploratory findings were not all preserved.'
    );
  }

  if (
    markdown.includes(
      'тАФ'
    )
  ) {
    throw new Error(
      'The Markdown report still contains the corrupted dash encoding.'
    );
  }

  console.log(
    'Site-wide Markdown and JSON report check passed.'
  );

  console.log(
    `Unique findings: ${siteWideExploratoryFindings.length}`
  );

  console.log(
    `Original occurrences: ${report.summary.exploratoryQaFindingsCount}`
  );

  console.log(
    `JSON report: ${jsonReport.filePath}`
  );

  console.log(
    `Markdown report: ${markdownReport.filePath}`
  );
}

main().catch(
  (error: unknown) => {
    console.error(
      'Site-wide report check failed:',
      error
    );

    process.exitCode =
      1;
  }
);
