import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

export interface CapturedScreenshot {
  filePath: string;
}

function formatPageNumber(
  pageNumber: number
): string {
  return String(pageNumber).padStart(2, '0');
}

export async function capturePageScreenshot(
  page: Page,
  runId: string,
  pageNumber: number
): Promise<CapturedScreenshot> {
  const evidenceDirectory = join(
    'agent-results',
    runId,
    'evidence'
  );

  const filePath = join(
    evidenceDirectory,
    `page-${formatPageNumber(pageNumber)}.png`
  );

  await mkdir(
    evidenceDirectory,
    {
      recursive: true
    }
  );

  await page.screenshot({
    path: filePath,
    fullPage: true
  });

  return {
    filePath
  };
}
