import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { handlePanelNewsletterSend, handlePanelNewsletterTest } from '@/lib/panel-newsletter-route';
import { NewsletterError } from '@/lib/newsletter-error';
import { issueSession, PANEL_COOKIE } from '@/lib/panel-auth';

const ORIGIN = 'https://example.test';
const originalSecret = process.env.ADMIN_PANEL_SECRET;
const sendIssue = async (issue: string) => {
  if (issue === 'issue-that-does-not-exist') {
    throw new NewsletterError(`Issue "${issue}" no existe`, 404);
  }
  return { issue, recipients: 3, sent: 0, failed: 0, dryRun: true };
};

function request(body: unknown, session?: string, origin = ORIGIN) {
  const headers = new Headers({
    'content-type': 'application/json',
    origin,
  });
  if (session) headers.set('cookie', `${PANEL_COOKIE}=${session}`);
  return new Request(`${ORIGIN}/panel/newsletter`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('panel newsletter send route', () => {
  beforeEach(() => {
    process.env.ADMIN_PANEL_SECRET = 'test-only-panel-secret';
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.ADMIN_PANEL_SECRET;
    else process.env.ADMIN_PANEL_SECRET = originalSecret;
  });

  test('rejects a request without a panel session', async () => {
    const response = await handlePanelNewsletterSend(request({ issue: 'unknown', dryRun: true }), sendIssue);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { ok: false, error: 'no_autorizado' });
  });

  test('rejects an invalid panel session', async () => {
    const response = await handlePanelNewsletterSend(
      request({ issue: 'unknown', dryRun: true }, 'expired.or-invalid'),
      sendIssue,
    );
    assert.equal(response.status, 401);
  });

  test('rejects a request from a different origin', async () => {
    const response = await handlePanelNewsletterSend(
      request({ issue: 'unknown', dryRun: true }, issueSession() ?? undefined, 'https://evil.test'),
      sendIssue,
    );
    assert.equal(response.status, 403);
  });

  test('requires a reviewed count before a real send', async () => {
    const response = await handlePanelNewsletterSend(
      request({ issue: 'unknown', dryRun: false }, issueSession() ?? undefined),
      sendIssue,
    );
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { ok: false, error: 'ensayo_requerido' });
  });

  test('validates authenticated dry-run requests before touching data services', async () => {
    const response = await handlePanelNewsletterSend(
      request({ issue: 'issue-that-does-not-exist', dryRun: true }, issueSession() ?? undefined),
      sendIssue,
    );
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: 'Issue "issue-that-does-not-exist" no existe',
    });
  });

  test('returns only the dry-run counts from the sending service', async () => {
    const response = await handlePanelNewsletterSend(
      request({ issue: 'approved-issue', dryRun: true }, issueSession() ?? undefined),
      sendIssue,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      issue: 'approved-issue',
      recipients: 3,
      sent: 0,
      failed: 0,
      dryRun: true,
    });
  });

  test('reports a partial send as incomplete and forwards the reviewed count', async () => {
    let reviewedCount: number | undefined;
    const partialSend = async (_issue: string, options: { expectedRecipients?: number }) => {
      reviewedCount = options.expectedRecipients;
      return { issue: 'approved-issue', recipients: 3, sent: 2, failed: 1, dryRun: false };
    };
    const response = await handlePanelNewsletterSend(
      request(
        { issue: 'approved-issue', dryRun: false, expectedRecipients: 3 },
        issueSession() ?? undefined,
      ),
      partialSend,
    );

    assert.equal(reviewedCount, 3);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      ok: false,
      issue: 'approved-issue',
      recipients: 3,
      sent: 2,
      failed: 1,
      dryRun: false,
    });
  });
});

describe('panel test send route («Mandarme una prueba»)', () => {
  const enviadas: string[] = [];
  const sendTestIssue = async (issue: string) => {
    if (issue === 'no-existe') throw new NewsletterError(`Issue "${issue}" no existe`, 404);
    enviadas.push(issue);
    return { issue, to: 'buzon@example.test' };
  };

  beforeEach(() => {
    process.env.ADMIN_PANEL_SECRET = 'test-only-panel-secret';
    enviadas.length = 0;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.ADMIN_PANEL_SECRET;
    else process.env.ADMIN_PANEL_SECRET = originalSecret;
  });

  test('behind the same gate as the real send: session and origin', async () => {
    assert.equal((await handlePanelNewsletterTest(request({ issue: 'x' }), sendTestIssue)).status, 401);
    assert.equal(
      (await handlePanelNewsletterTest(request({ issue: 'x' }, issueSession() ?? undefined, 'https://evil.test'), sendTestIssue)).status,
      403,
    );
    assert.deepEqual(enviadas, [], 'nothing goes out without the panel session.');
  });

  test('sends the chosen edition and says where it went', async () => {
    const response = await handlePanelNewsletterTest(request({ issue: 'borrador-semanal' }, issueSession() ?? undefined), sendTestIssue);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, issue: 'borrador-semanal', to: 'buzon@example.test' });
    assert.deepEqual(enviadas, ['borrador-semanal']);
  });

  test('an unknown edition is a 404 with its message', async () => {
    const response = await handlePanelNewsletterTest(request({ issue: 'no-existe' }, issueSession() ?? undefined), sendTestIssue);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { ok: false, error: 'Issue "no-existe" no existe' });
  });
});
