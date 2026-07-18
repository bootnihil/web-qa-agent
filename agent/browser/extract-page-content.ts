import type { Page } from '@playwright/test';

const MAX_BODY_TEXT_LENGTH = 15_000;
const MAX_LINKS = 50;
const MAX_BUTTONS = 30;
const MAX_SELECTS = 20;
const MAX_OPTIONS_PER_SELECT = 250;

export interface PageContentLink {
  text: string;
  url: string;
}

export interface PageSelectOption {
  text: string;
  value: string;
  selected: boolean;
}

export interface PageSelectControl {
  label: string | null;
  name: string | null;
  id: string | null;
  options: PageSelectOption[];
}

export interface ExtractedPageContent {
  title: string;
  headings: string[];
  bodyText: string;
  links: PageContentLink[];
  buttons: string[];
  selects: PageSelectControl[];
}

function normalizeText(
  text: string
): string {
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

export async function extractPageContent(
  page: Page
): Promise<ExtractedPageContent> {
  const title = await page.title();

  const headings = await page
    .locator('h1, h2, h3')
    .allTextContents();

  const normalizedHeadings = headings
    .map(normalizeText)
    .filter(Boolean);

  const bodyText = await page
    .locator('body')
    .innerText();

  const normalizedBodyText =
    normalizeText(bodyText).slice(
      0,
      MAX_BODY_TEXT_LENGTH
    );

  const links = await page
    .locator('a[href]')
    .evaluateAll(
      (
        elements,
        maxLinks
      ) => {
        return elements
          .filter((element) => {
            const htmlElement =
              element as HTMLElement;

            return (
              htmlElement.offsetWidth > 0 &&
              htmlElement.offsetHeight > 0
            );
          })
          .slice(0, maxLinks)
          .map((element) => {
            const anchor =
              element as HTMLAnchorElement;

            return {
              text:
                anchor.innerText
                  .replace(/\s+/g, ' ')
                  .trim(),
              url: anchor.href
            };
          });
      },
      MAX_LINKS
    );

  const buttons = await page
    .locator(
      'button, [role="button"], input[type="button"], input[type="submit"]'
    )
    .evaluateAll(
      (
        elements,
        maxButtons
      ) => {
        return elements
          .filter((element) => {
            const htmlElement =
              element as HTMLElement;

            return (
              htmlElement.offsetWidth > 0 &&
              htmlElement.offsetHeight > 0
            );
          })
          .slice(0, maxButtons)
          .map((element) => {
            if (
              element instanceof HTMLInputElement
            ) {
              return element.value
                .replace(/\s+/g, ' ')
                .trim();
            }

            return (
              element.textContent ?? ''
            )
              .replace(/\s+/g, ' ')
              .trim();
          })
          .filter(Boolean);
      },
      MAX_BUTTONS
    );

  const selects = await page
    .locator('select')
    .evaluateAll(
      (
        elements,
        limits
      ) => {
        return elements
          .slice(
            0,
            limits.maxSelects
          )
          .map((element) => {
            const select =
              element as HTMLSelectElement;

            let label: string | null =
              null;

            /*
             * First try the native labels collection.
             * This covers:
             *
             * <label for="country">Country</label>
             * <select id="country">...</select>
             *
             * and:
             *
             * <label>
             *   Country
             *   <select>...</select>
             * </label>
             */
            if (
              select.labels &&
              select.labels.length > 0
            ) {
              label =
                select.labels[0]
                  .textContent
                  ?.replace(/\s+/g, ' ')
                  .trim() || null;
            }

            /*
             * Fall back to aria-label when no
             * native HTML label is available.
             */
            if (!label) {
              label =
                select
                  .getAttribute(
                    'aria-label'
                  )
                  ?.replace(/\s+/g, ' ')
                  .trim() || null;
            }

            const options =
              Array.from(
                select.options
              )
                .slice(
                  0,
                  limits.maxOptionsPerSelect
                )
                .map((option) => {
                  return {
                    text:
                      option.text
                        .replace(
                          /\s+/g,
                          ' '
                        )
                        .trim(),
                    value:
                      option.value,
                    selected:
                      option.selected
                  };
                });

            return {
              label,
              name:
                select.name ||
                null,
              id:
                select.id ||
                null,
              options
            };
          });
      },
      {
        maxSelects:
          MAX_SELECTS,
        maxOptionsPerSelect:
          MAX_OPTIONS_PER_SELECT
      }
    );

  return {
    title,
    headings:
      normalizedHeadings,
    bodyText:
      normalizedBodyText,
    links:
      links.filter(
        (link) =>
          link.text.length > 0 &&
          link.url.length > 0
      ),
    buttons,
    selects
  };
}
