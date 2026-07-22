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
   * Maximum number of site-level navigation decisions the
   * agent may perform during one exploration run.
   *
   * The internal property retains its historical
   * maxAgentSteps name for now. The user-facing CLI exposes
   * this more clearly as --navigation-steps.
   */
  maxAgentSteps: number;

  /*
   * Maximum number of autonomous exploratory actions the
   * planner may perform while investigating one already-open
   * page.
   */
  maxExploratoryStepsPerPage: number;

  allowFormSubmission: boolean;
}
