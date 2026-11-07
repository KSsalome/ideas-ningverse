// 使用隔離 D1 與測試簽章模擬 Google 回應，不讀取使用者密鑰或正式資料庫。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { googleAuthRoute, readGoogleUser, safeReturnTo, tokenHash } from '../lib/google-auth.ts';
const require = createRequire(createRequire(import.meta.url).resolve('wrangler'));
const { Miniflare } = require('miniflare');

test('Google 登入、回呼與工作階段的整合驗證', async t => {
 const mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2026-05-15', d1Databases: ['DB'], cf: false, inspectorPort: 0 });
 const originalFetch = globalThis.fetch;
 try {
  const DB = await mf.getD1Database('DB');
  const file = (await readdir('drizzle')).find(x => x.startsWith('0004_') && x.endsWith('.sql'));
  for (const statement of (await readFile('drizzle/' + file, 'utf8')).split('--> statement-breakpoint')) if (statement.trim()) await DB.prepare(statement).run();
  const env = { DB, GOOGLE_CLIENT_ID: 'local-test-client', GOOGLE_CLIENT_SECRET: 'local-test-secret' };
  const keys = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(keys.publicKey), kid: 'test-key', use: 'sig', alg: 'RS256' };
  let currentNonce = '', mode = 'valid', exchanges = 0;
  // 模擬提供者的 HTTPS 端點；測試簽章只在此測試中使用。
  globalThis.fetch = async (input, init) => {
   const url = new URL(typeof input === 'string' ? input : input.url ?? input.toString());
   if (url.href === 'https://www.googleapis.com/oauth2/v3/certs') return Response.json({ keys: [jwk] });
   if (url.href === 'https://oauth2.googleapis.com/token') {
    exchanges++;
    const body = new URLSearchParams(init.body);
    assert.equal(body.get('client_secret'), 'local-test-secret');
    assert.ok(body.get('code_verifier'));
    const payload = { nonce: mode === 'wrong-nonce' ? 'different' : currentNonce, email: 'owner@example.invalid', email_verified: mode !== 'unverified', name: '測試旅人' };
    const idToken = await new SignJWT(payload).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer('https://accounts.google.com').setAudience(mode === 'wrong-audience' ? 'another-client' : env.GOOGLE_CLIENT_ID).setSubject('stable-google-id').setIssuedAt().setExpirationTime(mode === 'expired' ? '-1h' : '5m').sign(keys.privateKey);
    return Response.json({ access_token: 'test-access-token', token_type: 'Bearer', id_token: mode === 'bad-signature' ? idToken.slice(0, -5) + 'aaaaa' : idToken, expires_in: 300 });
   }
   return originalFetch(input, init);
  };
  const route = (path, headers = {}, method = 'GET') => googleAuthRoute(new Request('http://localhost:5173' + path, { headers, method }), env, true);
  const begin = async (returnTo = '/') => {
   const response = await route('/auth/google/start?return_to=' + encodeURIComponent(returnTo));
   assert.equal(response.status, 303);
   const target = new URL(response.headers.get('location'));
   assert.equal(target.searchParams.get('scope'), 'openid email profile');
   assert.equal(target.searchParams.get('code_challenge_method'), 'S256');
   assert.equal(target.searchParams.get('redirect_uri'), 'http://localhost:5173/auth/google/callback');
   currentNonce = target.searchParams.get('nonce');
   return { state: target.searchParams.get('state'), cookie: response.headers.getSetCookie()[0].split(';')[0] };
  };
  let sessionCookie;
  await t.test('偽造舊身分標頭不會取得登入身分', async () => {
   assert.equal(await readGoogleUser(new Headers({ 'oai-authenticated-user-id': 'owner', 'oai-authenticated-user-email': 'owner@example.invalid' }), env, true), null);
   for (const value of ['//evil.invalid', '/\\evil.invalid', '/auth/google/start', '/\n/evil.invalid']) assert.equal(safeReturnTo(value), '/');
  });
  await t.test('不同 state 不交換憑證；有效回呼只接受一次', async () => {
   const flow = await begin('/library?building=books');
   assert.equal((await route('/auth/google/callback?state=wrong&code=test', { Cookie: flow.cookie })).status, 400);
   assert.equal(exchanges, 0);
   const response = await route('/auth/google/callback?state=' + flow.state + '&code=test', { Cookie: flow.cookie });
   assert.equal(response.status, 303);
   assert.equal(response.headers.get('location'), '/library?building=books');
   sessionCookie = response.headers.getSetCookie().find(x => x.startsWith('ningverse_session=')).split(';')[0];
   assert.equal((await readGoogleUser(new Headers({ Cookie: sessionCookie }), env, true)).userId, 'google:stable-google-id');
   assert.equal((await route('/auth/google/callback?state=' + flow.state + '&code=test', { Cookie: flow.cookie })).status, 400);
   assert.equal(exchanges, 1);
  });
  for (const failureMode of ['wrong-nonce', 'wrong-audience', 'expired', 'bad-signature', 'unverified']) await t.test('拒絕 Google 回應：' + failureMode, async () => {
   mode = failureMode;
   const flow = await begin();
   const result = await route('/auth/google/callback?state=' + flow.state + '&code=test', { Cookie: flow.cookie });
   assert.equal(result.status, 400);
   assert.ok(!result.headers.getSetCookie().some(x => x.startsWith('ningverse_session=')));
   mode = 'valid';
  });
  await t.test('登出需同源 POST，並立即撤銷工作階段', async () => {
   assert.equal((await route('/auth/logout', { Cookie: sessionCookie })).status, 200);
   assert.equal((await route('/auth/logout', { Cookie: sessionCookie, Origin: 'https://evil.invalid' }, 'POST')).status, 403);
   assert.ok(await readGoogleUser(new Headers({ Cookie: sessionCookie }), env, true));
   assert.equal((await route('/auth/logout', { Cookie: sessionCookie, Origin: 'http://localhost:5173' }, 'POST')).status, 303);
   assert.equal(await readGoogleUser(new Headers({ Cookie: sessionCookie }), env, true), null);
  });
  await t.test('過期 session 與錯誤來源無效；正式環境使用 Secure cookie', async () => {
   const raw = 'a'.repeat(43);
   await DB.prepare('INSERT INTO auth_sessions VALUES(?,?,?,?,?)').bind(await tokenHash(raw), 'expired-user', 'expired', 'x@example.invalid', Date.now() - 1).run();
   assert.equal(await readGoogleUser(new Headers({ Cookie: 'ningverse_session=' + raw }), env, true), null);
   assert.equal((await googleAuthRoute(new Request('https://evil.invalid/auth/google/start'), { ...env, AUTH_ORIGIN: 'https://island.test' })).status, 503);
   const response = await googleAuthRoute(new Request('https://island.test/auth/google/start'), { ...env, AUTH_ORIGIN: 'https://island.test' });
   assert.match(response.headers.getSetCookie()[0], /^__Host-ningverse_oauth=.*; Secure$/);
  });
 } finally { globalThis.fetch = originalFetch; await mf.dispose(); }
});
