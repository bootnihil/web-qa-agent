import type { PageFinding } from '../analysis/evaluate-page';
import type { NavigationLink } from '../browser/inspect-navigation';
import type { VisitedPageObservation } from '../browser/visit-approved-link';

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
  findings: PageFinding[];
}

export interface AgentRunOutcome {
  type: 'completed' | 'finished';
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

  inspectedPages: InspectedPageResult[];

  summary: {
    pagesInspected: number;
    findingsCount: number;
    highestSeverity: 'high' | 'medium' | 'low' | 'none';
  };
}
