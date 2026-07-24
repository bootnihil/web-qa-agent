import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';

import type {
  UnifiedFinding
} from './findings/finding-model';

import type {
  SiteAgentReport
} from './reporting/report-types';

import {
  writeJsonReport
} from './reporting/write-json-report';

import {
  writeMarkdownReport
} from './reporting/write-markdown-report';

import type {
  PassivePageSecuritySnapshot
} from './security/passive-security-model';

import {
  createPassiveSecurityRegistry,
  getPassiveSecurityReport,
  registerPassiveSecuritySnapshot
} from './security/passive-security-registry';

function createSnapshot(
  pageNumber: number
): PassivePageSecuritySnapshot {
  const finalUrl =
    `https://example.com/page-${pageNumber}`;

  return {
    requestedUrl:
      finalUrl,
    finalUrl,
    responseUrl:
      finalUrl,
    responseStatus:
      200,
    responseReceived:
      true,
    finalScheme:
      'https:',
    origin:
      'https://example.com',
    pageTitle:
      `Page ${pageNumber}`,
    redirects:
      [],
    headers: {
      'content-security-policy': [
        "default-src 'self'"
      ],
      'x-content-type-options': [
        'nosniff'
      ],
      'x-frame-options': [
        'DENY'
      ],
      server: [
        'fixture-server'
      ]
    }
  };
}

async function main():
  Promise<void> {
  const registry =
    createPassiveSecurityRegistry();

  registerPassiveSecuritySnapshot(
    registry,
    createSnapshot(
      1
    )
  );

  registerPassiveSecuritySnapshot(
    registry,
    createSnapshot(
      2
    )
  );

  const passiveSecurity =
    getPassiveSecurityReport(
      registry
    );

  const functionalFindings:
    UnifiedFinding[] = [
      {
        findingReference:
          'finding-1',
        fingerprint:
          'rule|HTTP_CLIENT_ERROR',
        category:
          'technical',
        severity:
          'high',
        title:
          'Page returned HTTP 404',
        description:
          'The main document returned a client-error response.',
        suggestedCheck:
          null,
        occurrences: [
          {
            occurrenceReference:
              'occurrence-1',
            pageUrl:
              'https://example.com/missing',
            pageTitle:
              'Missing',
            target:
              null,
            evidence: [
              {
                evidenceReference:
                  'evidence-1',
                source:
                  'deterministic-rule',
                kind:
                  'rule-observation',
                relation:
                  'supports',
                verificationCapable:
                  true,
                summary:
                  'The main document returned HTTP 404.'
              }
            ],
            verification: {
              state:
                'verified',
              reason:
                'Deterministic evidence supports the exact assertion.',
              evidenceReferences: [
                'evidence-1'
              ]
            },
            screenshotReferences:
              [],
            redundantInvestigationSkipped:
              false
          }
        ],
        verification: {
          state:
            'verified',
          reason:
            'At least one occurrence was deterministically verified.',
          evidenceReferences: [
            'evidence-1'
          ]
        }
      }
    ];

  const report:
    SiteAgentReport = {
    reportSchemaVersion:
      '3',
    runId:
      'passive-security-report-check',
    startedAt:
      '2026-07-24T00:00:00.000Z',
    finishedAt:
      '2026-07-24T00:01:00.000Z',
    site: {
      id:
        'synthetic-stage-7-1',
      name:
        'Synthetic Stage 7.1 report',
      startUrl:
        'https://example.com/'
    },
    homepage: {
      requestedUrl:
        'https://example.com/',
      finalUrl:
        'https://example.com/',
      title:
        'Synthetic',
      httpStatus:
        200
    },
    outcome: {
      type:
        'completed',
      summary:
        'Synthetic Stage 7.1 report completed.'
    },
    inspectedPages:
      [],
    findings:
      functionalFindings,
    siteWideExploratoryFindings:
      [],
    passiveSecurity,
    summary: {
      pagesInspected:
        0,
      logicalFindingsCount:
        1,
      findingOccurrencesCount:
        1,
      findingsCount:
        1,
      highestSeverity:
        'high',
      exploratoryQaFindingsCount:
        0,
      siteWideExploratoryFindingsCount:
        0,
      knownFindingOccurrencesCount:
        0,
      knownFindingsSuppliedToAnalysisCount:
        0,
      newCandidateFindingsCount:
        0,
      redundantInvestigationsSkippedCount:
        0,
      highestExploratoryQaSeverity:
        'none',
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

  const jsonText =
    await readFile(
      jsonReport.filePath,
      'utf8'
    );

  const markdown =
    await readFile(
      markdownReport.filePath,
      'utf8'
    );

  const parsed =
    JSON.parse(
      jsonText
    ) as SiteAgentReport;

  assert.equal(
    parsed.reportSchemaVersion,
    '3'
  );

  assert.deepEqual(
    parsed.findings,
    functionalFindings
  );

  assert.equal(
    parsed.summary
      .highestSeverity,
    'high'
  );

  assert.equal(
    parsed.findings[0]
      .verification.state,
    'verified'
  );

  assert.equal(
    parsed.passiveSecurity
      .summary
      .observationsCount,
    passiveSecurity
      .observations
      .length
  );

  assert.equal(
    parsed.passiveSecurity
      .observations
      .find(
        observation =>
          observation.code ===
          'PS_HSTS_NOT_OBSERVED'
      )
      ?.occurrences.length,
    2
  );

  assert.match(
    markdown,
    /## Passive Security Posture/
  );

  assert.match(
    markdown,
    /did not perform penetration testing or active vulnerability probing/
  );

  assert.match(
    markdown,
    /PS_HSTS_NOT_OBSERVED/
  );

  assert.match(
    markdown,
    /Observed on:\*\* 2 pages \(2 occurrences\)/
  );

  assert.match(
    markdown,
    /VERIFIED - Page returned HTTP 404/
  );

  assert.equal(
    /verified vulnerability/i.test(
      markdown
    ),
    false
  );

  for (
    const observation of
      parsed
        .passiveSecurity
        .observations
  ) {
    assert.match(
      markdown,
      new RegExp(
        observation
          .observationReference
      )
    );

    assert.match(
      markdown,
      new RegExp(
        observation.code
      )
    );
  }

  for (
    const forbiddenValue of
      [
        'Set-Cookie',
        'super-secret-cookie',
        'Authorization',
        'Bearer '
      ]
  ) {
    assert.equal(
      jsonText.includes(
        forbiddenValue
      ),
      false
    );
  }

  console.log(
    'Stage 7.1 JSON/Markdown separation, aggregation, provenance, and functional-regression report checks passed.'
  );
}

main().catch(
  error => {
    console.error(
      'Stage 7.1 report checks failed.'
    );
    console.error(
      error
    );
    process.exitCode =
      1;
  }
);
