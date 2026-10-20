import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, apiRequest } from '../src/services/api.ts';

test('requests JSON paths and preserves headers/options', async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/services?region=br');
    assert.equal(options.signal, controller.signal);
    assert.equal(options.headers.get('Accept'), 'application/json');
    assert.equal(options.headers.get('X-Request-ID'), 'test-request');
    return Response.json([{ id: 1, name: 'Serviço de teste' }]);
  });
  assert.deepEqual(
    await apiRequest('/services?region=br', {
      signal: controller.signal,
      headers: { 'X-Request-ID': 'test-request' },
    }),
    [{ id: 1, name: 'Serviço de teste' }],
  );
});

test('preserves POST body and an explicit Accept header', async (t) => {
  const body = JSON.stringify({ enabled: true });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/example');
    assert.equal(options.method, 'POST');
    assert.equal(options.body, body);
    assert.equal(options.headers.get('Content-Type'), 'application/json');
    assert.equal(options.headers.get('Accept'), 'application/problem+json');
    return Response.json({ saved: true });
  });
  assert.deepEqual(
    await apiRequest('/example', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/problem+json',
      },
    }),
    { saved: true },
  );
});

test('converts HTTP failures to ApiError without exposing the response body', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('Internal database details', { status: 500 }),
  );
  await assert.rejects(apiRequest('/services'), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 500);
    assert.equal(error.name, 'ApiError');
    assert.equal(error.message.includes('Internal database details'), false);
    return true;
  });
});

test('handles responses without a body', async (t) => {
  for (const status of [204, 205]) {
    t.mock.method(
      globalThis,
      'fetch',
      async () => new Response(null, { status }),
    );
    assert.equal(await apiRequest('/example'), undefined);
  }
});

test('propagates network errors and aborted requests', async (t) => {
  for (const failure of [
    new TypeError('Failed to fetch'),
    new DOMException('Request aborted', 'AbortError'),
  ]) {
    t.mock.method(globalThis, 'fetch', async () => {
      throw failure;
    });
    await assert.rejects(apiRequest('/services'), (error) => error === failure);
  }
});

test('rejects malformed JSON', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('<html>Not JSON</html>'),
  );
  await assert.rejects(apiRequest('/services'), SyntaxError);
});

test('rejects absolute URLs and invalid paths before fetching', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch');
  for (const path of [
    'https://example.com/services',
    '//example.com/services',
    'services',
    '/\\example.com/services',
  ]) {
    await assert.rejects(apiRequest(path), TypeError);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});
