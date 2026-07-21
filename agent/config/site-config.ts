export interface SiteConfig {
  id: string;
  name: string;
  startUrl: string;
  allowedHosts: string[];

  /*
   * Maximum number of distinct pages that may be inspected
   * during one site exploration run.
   */
  maxPages: number;

  /*
   * Existing upper bound on multi-page agent/navigation decisions.
   *
   * This will later be renamed to maxNavigationSteps when the
   * multi-page autonomous integration is completed.
   */
  maxAgentSteps: number;

  /*
   * Maximum number of autonomous exploratory actions the planner
   * may perform while investigating one already-open page.
   */
  maxExploratoryStepsPerPage: number;

  allowFormSubmission: boolean;
}
