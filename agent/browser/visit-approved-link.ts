import type {
  Page,
  Response
} from '@playwright/test';

import {
  captureMainDocumentSecurity
} from '../security/capture-main-document-security';

import type {
  PassivePageSecuritySnapshot
} from '../security/passive-security-model';

import type { NavigationLink } from './inspect-navigation';

export interface VisitedPageObservation {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  httpStatus: number | null;
  headings: string[];
}

export interface PassiveApprovedPageVisit {
  observation:
    VisitedPageObservation;
  passiveSecuritySnapshot:
    PassivePageSecuritySnapshot;
}

interface ApprovedPageVisitCore {
  observation:
    VisitedPageObservation;
  response:
    Response | null;
}

async function visitApprovedLinkCore(
  page: Page,
  link: NavigationLink,
  allowedHosts: string[]
): Promise<ApprovedPageVisitCore> {
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
    observation: {
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
    },
    response
  };
}

export async function visitApprovedLink(
  page: Page,
  link: NavigationLink,
  allowedHosts: string[]
): Promise<VisitedPageObservation> {
  return (
    await visitApprovedLinkCore(
      page,
      link,
      allowedHosts
    )
  ).observation;
}

export async function visitApprovedLinkWithPassiveSecurity(
  page: Page,
  link: NavigationLink,
  allowedHosts: string[]
): Promise<PassiveApprovedPageVisit> {
  const {
    observation,
    response
  } =
    await visitApprovedLinkCore(
      page,
      link,
      allowedHosts
    );

  return {
    observation,
    passiveSecuritySnapshot:
      await captureMainDocumentSecurity({
        response,
        requestedUrl:
          observation.requestedUrl,
        finalUrl:
          observation.finalUrl,
        pageTitle:
          observation.title
      })
  };
}
