import type {
  ExploratoryQaFinding
} from '../analysis/exploratory-qa-schema';

export interface ExploratoryFindingPageInput {
  pageUrl: string;

  pageTitle: string;

  screenshotPath:
    string | null;

  findings:
    ExploratoryQaFinding[];
}

export interface SiteWideFindingOccurrence {
  /*
   * Human-readable, one-based positions.
   *
   * These point back to the original per-page findings
   * retained in the full report.
   */
  pageNumber: number;

  findingNumber: number;

  pageUrl: string;

  pageTitle: string;

  screenshotPath:
    string | null;
}

export interface SiteWideExploratoryFinding {
  /*
   * Deterministic identity used to group equivalent
   * exploratory findings across multiple pages.
   */
  fingerprint: string;

  /*
   * The first finding placed in this group.
   *
   * The original findings remain available under
   * inspectedPages; this is only the representative
   * version displayed at site level.
   */
  representativeFinding:
    ExploratoryQaFinding;

  occurrenceCount: number;

  affectedPageCount: number;

  occurrences:
    SiteWideFindingOccurrence[];
}

/*
 * Normalize AI-produced and browser-extracted text so that
 * harmless differences in capitalization, punctuation, and
 * whitespace do not prevent deterministic matching.
 *
 * Examples:
 *
 *   "COUNTRY*"  -> "country"
 *   " Equador " -> "equador"
 */
function normalizeFingerprintText(
  value:
    string | null
): string {
  if (
    value === null
  ) {
    return '';
  }

  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(
      /[^\p{L}\p{N}]+/gu,
      ' '
    )
    .trim()
    .replace(
      /\s+/g,
      ' '
    );
}

/*
 * Choose the most meaningful available identity for a
 * supported select control.
 *
 * Labels are preferred because they are normally the most
 * human-readable and stable across pages. The field name and
 * element ID are used only when no label is available.
 */
function getSelectControlIdentity(
  finding:
    ExploratoryQaFinding
): string {
  const target =
    finding.evidenceTarget;

  if (
    target === null
  ) {
    return '';
  }

  const candidates = [
    target.controlLabel,
    target.controlName,
    target.controlId
  ];

  for (
    const candidate
    of candidates
  ) {
    const normalizedCandidate =
      normalizeFingerprintText(
        candidate
      );

    if (
      normalizedCandidate.length >
      0
    ) {
      return normalizedCandidate;
    }
  }

  return 'unknown control';
}

/*
 * Machine-readable evidence targets provide the strongest
 * available basis for cross-page deduplication.
 *
 * The real Aidoc issue, for example, becomes approximately:
 *
 *   target|select-option|country|equador
 *
 * AI-generated titles and categories may differ between
 * pages, but the underlying machine-readable target remains
 * stable.
 */
export function createExploratoryFindingFingerprint(
  finding:
    ExploratoryQaFinding
): string {
  const normalizedCategory =
    normalizeFingerprintText(
      finding.category
    );

  const target =
    finding.evidenceTarget;

  if (
    target !== null
  ) {
    const controlIdentity =
      getSelectControlIdentity(
        finding
      );

    const optionText =
      normalizeFingerprintText(
        target.optionText
      );

    /*
     * Do not include the AI-generated category here.
     *
     * When a finding has a machine-readable target, the
     * target itself is the stronger identity signal.
     * Gemini may describe the same defect as "content" on
     * one page and "consistency" on another.
     */
    return [
      'target',
      target.kind,
      controlIdentity,
      optionText
    ].join('|');
  }

  /*
   * Findings without a machine-readable target use a
   * deliberately conservative fallback.
   *
   * Category is retained here because, without structured
   * target information, it helps prevent unrelated findings
   * from being incorrectly merged.
   *
   * This may leave some semantic duplicates unmerged, but
   * that is safer than incorrectly merging unrelated issues.
   */
  return [
    'fallback',
    normalizedCategory,
    normalizeFingerprintText(
      finding.title
    ),
    normalizeFingerprintText(
      finding.evidence
    )
  ].join('|');
}

export function buildSiteWideExploratoryFindings(
  pages:
    ExploratoryFindingPageInput[]
): SiteWideExploratoryFinding[] {
  const groupedOccurrences =
    new Map<
      string,
      {
        representativeFinding:
          ExploratoryQaFinding;

        occurrences:
          SiteWideFindingOccurrence[];
      }
    >();

  pages.forEach(
    (
      page,
      pageIndex
    ) => {
      page.findings.forEach(
        (
          finding,
          findingIndex
        ) => {
          const fingerprint =
            createExploratoryFindingFingerprint(
              finding
            );

          const occurrence:
            SiteWideFindingOccurrence = {
            pageNumber:
              pageIndex + 1,

            findingNumber:
              findingIndex + 1,

            pageUrl:
              page.pageUrl,

            pageTitle:
              page.pageTitle,

            screenshotPath:
              page.screenshotPath
          };

          const existingGroup =
            groupedOccurrences.get(
              fingerprint
            );

          if (
            existingGroup
          ) {
            existingGroup
              .occurrences
              .push(
                occurrence
              );

            return;
          }

          groupedOccurrences.set(
            fingerprint,
            {
              representativeFinding:
                finding,

              occurrences: [
                occurrence
              ]
            }
          );
        }
      );
    }
  );

  return Array.from(
    groupedOccurrences.entries()
  ).map(
    (
      [
        fingerprint,
        group
      ]
    ) => ({
      fingerprint,

      representativeFinding:
        group.representativeFinding,

      occurrenceCount:
        group.occurrences.length,

      affectedPageCount:
        new Set(
          group.occurrences.map(
            occurrence =>
              occurrence.pageUrl
          )
        ).size,

      occurrences:
        group.occurrences
    })
  );
}
