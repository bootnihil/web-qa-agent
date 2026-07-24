import assert from 'node:assert/strict';
import {
  createServer
} from 'node:http';

import {
  chromium
} from '@playwright/test';

import {
  visitApprovedLinkWithPassiveSecurity
} from './browser/visit-approved-link';

import {
  captureMainDocumentSecurity
} from './security/capture-main-document-security';

import {
  createPassiveSecurityRegistry,
  getPassiveSecurityReport,
  registerPassiveSecuritySnapshot
} from './security/passive-security-registry';

interface ReceivedRequest {
  method: string;
  path: string;
  body: string;
}

async function main():
  Promise<void> {
  const receivedRequests:
    ReceivedRequest[] = [];

  const server =
    createServer(
      (
        request,
        response
      ) => {
        const chunks:
          Buffer[] = [];

        request.on(
          'data',
          chunk => {
            chunks.push(
              Buffer.from(
                chunk
              )
            );
          }
        );

        request.on(
          'end',
          () => {
            const requestUrl =
              new URL(
                request.url ??
                  '/',
                'http://127.0.0.1'
              );

            receivedRequests.push({
              method:
                request.method ??
                '',
              path:
                requestUrl.pathname,
              body:
                Buffer.concat(
                  chunks
                ).toString(
                  'utf8'
                )
            });

            if (
              requestUrl.pathname ===
              '/start'
            ) {
              response.writeHead(
                302,
                {
                  location:
                    '/home?code=redirect-secret'
                }
              );
              response.end();
              return;
            }

            if (
              requestUrl.pathname !==
                '/home' &&
              requestUrl.pathname !==
                '/next'
            ) {
              response.writeHead(
                404,
                {
                  'content-type':
                    'text/plain'
                }
              );
              response.end(
                'not found'
              );
              return;
            }

            response.setHeader(
              'content-security-policy',
              [
                "default-src 'self'",
                "frame-ancestors 'self'"
              ]
            );

            response.writeHead(
              200,
              {
                'content-type':
                  'text/html; charset=utf-8',
                'x-content-type-options':
                  'nosniff',
                server:
                  'checkquest-fixture',
                'set-cookie':
                  'session=super-secret-cookie-value; HttpOnly',
                authorization:
                  'Bearer super-secret-authorization-value',
                'x-secret-token':
                  'super-secret-header-value'
              }
            );

            response.end(
              `<!doctype html>
<html>
  <head>
    <title>${requestUrl.pathname}</title>
  </head>
  <body>
    <h1>${requestUrl.pathname}</h1>
    <nav>
      <a href="/next">Next</a>
    </nav>
    <form action="/submit" method="post">
      <input name="payload">
      <button type="submit">Submit</button>
    </form>
  </body>
</html>`
            );
          }
        );
      }
    );

  await new Promise<void>(
    (
      resolve,
      reject
    ) => {
      server.once(
        'error',
        reject
      );

      server.listen(
        0,
        '127.0.0.1',
        () =>
          resolve()
      );
    }
  );

  const address =
    server.address();

  if (
    address ===
      null ||
    typeof address ===
      'string'
  ) {
    throw new Error(
      'Local passive-security fixture did not expose a TCP port.'
    );
  }

  const origin =
    `http://127.0.0.1:${address.port}`;

  const browser =
    await chromium.launch({
      headless:
        true
    });

  try {
    const page =
      await browser.newPage({
        serviceWorkers:
          'block'
      });

    const startResponse =
      await page.goto(
        `${origin}/start`,
        {
          waitUntil:
            'domcontentloaded'
        }
      );

    const startSnapshot =
      await captureMainDocumentSecurity({
        response:
          startResponse,
        requestedUrl:
          `${origin}/start`,
        finalUrl:
          page.url(),
        pageTitle:
          await page.title()
      });

    assert.equal(
      startSnapshot.redirects.length,
      1
    );

    assert.equal(
      startSnapshot.redirects[0]
        .status,
      302
    );

    assert.equal(
      startSnapshot.redirects[0]
        .location,
      `${origin}/home`
    );

    assert.deepEqual(
      Object.keys(
        startSnapshot.headers
      ).sort(),
      [
        'content-security-policy',
        'content-type',
        'server',
        'x-content-type-options'
      ]
    );

    assert.deepEqual(
      startSnapshot
        .headers[
          'content-security-policy'
        ],
      [
        "default-src 'self'",
        "frame-ancestors 'self'"
      ]
    );

    const nextVisit =
      await visitApprovedLinkWithPassiveSecurity(
        page,
        {
          text:
            'Next',
          url:
            `${origin}/next`
        },
        [
          '127.0.0.1'
        ]
      );

    const registry =
      createPassiveSecurityRegistry();

    registerPassiveSecuritySnapshot(
      registry,
      startSnapshot
    );

    registerPassiveSecuritySnapshot(
      registry,
      nextVisit
        .passiveSecuritySnapshot
    );

    const passiveReport =
      getPassiveSecurityReport(
        registry
      );

    assert.deepEqual(
      receivedRequests.map(
        request =>
          [
            request.method,
            request.path
          ]
      ),
      [
        [
          'GET',
          '/start'
        ],
        [
          'GET',
          '/home'
        ],
        [
          'GET',
          '/next'
        ]
      ]
    );

    assert.equal(
      receivedRequests.some(
        request =>
          request.body.length >
          0
      ),
      false
    );

    const forbiddenMethods =
      new Set([
        'HEAD',
        'OPTIONS',
        'TRACE',
        'POST',
        'PUT',
        'PATCH',
        'DELETE'
      ]);

    assert.equal(
      receivedRequests.some(
        request =>
          forbiddenMethods.has(
            request.method
          )
      ),
      false
    );

    const serialized =
      JSON.stringify(
        passiveReport
      );

    for (
      const sensitiveValue of
        [
          'super-secret-cookie-value',
          'super-secret-authorization-value',
          'super-secret-header-value',
          'redirect-secret',
          'set-cookie',
          'authorization',
          'x-secret-token'
        ]
    ) {
      assert.equal(
        serialized.includes(
          sensitiveValue
        ),
        false,
        `Passive report serialized forbidden value: ${sensitiveValue}.`
      );
    }

    assert.equal(
      passiveReport
        .observations
        .filter(
          observation =>
            observation.code ===
            'PS_HTTP_DOCUMENT'
        )
        .length,
      1
    );

    assert.equal(
      passiveReport
        .observations
        .find(
          observation =>
            observation.code ===
              'PS_HTTP_DOCUMENT'
        )
        ?.occurrences
        .length,
      2
    );

    console.log(
      'Stage 7.1 local browser safety acceptance passed with exactly three ordinary GET requests and no probe traffic.'
    );
  } finally {
    await browser.close();

    await new Promise<void>(
      (
        resolve,
        reject
      ) => {
        server.close(
          error => {
            if (
              error
            ) {
              reject(
                error
              );
              return;
            }

            resolve();
          }
        );
      }
    );
  }
}

main().catch(
  error => {
    console.error(
      'Stage 7.1 local browser safety acceptance failed.'
    );
    console.error(
      error
    );
    process.exitCode =
      1;
  }
);
