import type { Page } from '@playwright/test';
import type { NavigationLink } from './inspect-navigation';

export interface VisitedPageObservation {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  httpStatus: number | null;
  headings: string[];
}

export async function visitApprovedLink(
  page: Page,
  link: NavigationLink,
  allowedHosts: string[]
): Promise<VisitedPageObservation> {
  const requestedUrl = new URL(link.url);

  if (!allowedHosts.includes(requestedUrl.hostname)) {
    throw new Error(
      `Refusing to visit disallowed host "${requestedUrl.hostname}".`
    );
  }

  const response = await page.goto(requestedUrl.toString(), {
    waitUntil: 'domcontentloaded',
    timeout: 30_000
  });

  const finalUrl = new URL(page.url());

  if (!allowedHosts.includes(finalUrl.hostname)) {
    throw new Error(
      `Navigation redirected to disallowed host "${finalUrl.hostname}".`
    );
  }

  const headings = await page
    .locator('h1, h2')
    .allTextContents();

  return {
    requestedUrl: requestedUrl.toString(),
    finalUrl: finalUrl.toString(),
    title: await page.title(),
    httpStatus: response?.status() ?? null,
    headings: headings
      .map((heading) =>
        heading
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter((heading) => heading.length > 0)
      .slice(0, 10)
  };
}
