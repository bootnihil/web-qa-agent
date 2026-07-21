import type {
  ClassifiedDiagnostics
} from '../analysis/classify-diagnostics';

import type {
  PageFinding
} from '../analysis/evaluate-page';

import type {
  ExploratoryQaAnalysis
} from '../analysis/exploratory-qa-schema';

import type {
  PageDiagnostics
} from '../browser/collect-page-diagnostics';

import type {
  NavigationLink
} from '../browser/inspect-navigation';

import type {
  VisitedPageObservation
} from '../browser/visit-approved-link';

import type {
  ExploratoryLoopResult
} from '../planning/run-exploratory-loop';

export interface HomepageObservation {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  httpStatus: number | null;
}

export interface SelectedNavigationTarget {
  link: NavigationLink;
  reason: string;
}

export interface InspectedPageResult {
  selection: SelectedNavigationTarget;

  observation: VisitedPageObservation;

  /*
   * Raw browser evidence exactly as it was collected.
   */
  diagnostics: PageDiagnostics;

  /*
   * The same evidence after generic QA classification.
   * Nothing is deleted from the raw diagnostics.
   */
  classifiedDiagnostics: ClassifiedDiagnostics;

  /*
   * Screenshot evidence is captured only when the page
   * has something potentially worth investigating.
   */
  screenshotPath: string | null;

  /*
   * Deterministic findings produced by explicit rules.
   */
  findings: PageFinding[];

  /*
   * Evidence-grounded candidate findings produced
   * by Gemini exploratory QA analysis.
   */
  exploratoryQaAnalysis: ExploratoryQaAnalysis;

  /*
   * The bounded autonomous investigation performed
   * after exploratory QA analysis.
   *
   * This records the planner decisions, approved actions,
   * execution results, and before/after observations.
   *
   * Null means that no autonomous investigation was run
   * for this page.
   */
  exploratoryInvestigation:
    ExploratoryLoopResult | null;
}

export interface AgentRunOutcome {
  type:
    | 'completed'
    | 'finished';

  summary: string;
}

export interface SiteAgentReport {
  runId: string;
  startedAt: string;
  finishedAt: string;

  site: {
    id: string;
    name: string;
    startUrl: string;
  };

  homepage: HomepageObservation;

  outcome: AgentRunOutcome;

  inspectedPages:
    InspectedPageResult[];

  summary: {
    pagesInspected: number;

    findingsCount: number;

    highestSeverity:
      | 'high'
      | 'medium'
      | 'low'
      | 'none';

    exploratoryQaFindingsCount: number;

    highestExploratoryQaSeverity:
      | 'high'
      | 'medium'
      | 'low'
      | 'none';

    actionableDiagnosticsCount: number;

    diagnosticsNeedingReviewCount: number;

    ignoredDiagnosticNoiseCount: number;
  };
}
