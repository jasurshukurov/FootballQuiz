import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Minimal, dependency-free AWS client for the leaderboard sync.
 *
 * Why not @aws-sdk/client-dynamodb? The modular SDK v3 needs URL +
 * crypto.getRandomValues polyfills under Hermes and adds several hundred KB
 * to the bundle. The two APIs we call (Cognito Identity + DynamoDB) are plain
 * JSON-over-POST endpoints, and SigV4 only needs SHA-256/HMAC, implemented
 * below in pure JS so the exact same code runs on iOS/Android (Hermes, no
 * WebCrypto) and web. Correctness is locked down by lib/__tests__/awsClient.test.ts,
 * which checks the hashes and signatures against node:crypto and fixed vectors.
 *
 * Both endpoints send CORS headers, so this also works from the web build.
 */

export const AWS_REGION = 'us-east-1';
export const IDENTITY_POOL_ID = 'us-east-1:4fd35fb8-03ea-4eb7-9e2d-edc06dfe567a';
const IDENTITY_ID_STORAGE_KEY = 'aws-cognito-identity-id';
const REQUEST_TIMEOUT_MS = 10_000;
/** Refresh credentials this long before they actually expire. */
const CREDS_EXPIRY_BUFFER_MS = 2 * 60_000;

// ---------------------------------------------------------------------------
// SHA-256 + HMAC-SHA256 (pure JS, verified against node:crypto in tests)
// ---------------------------------------------------------------------------

// prettier-ignore
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/** UTF-8 encode without relying on TextEncoder (not guaranteed on Hermes). */
export function utf8Encode(str: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const low = str.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
}

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

export function sha256Bytes(message: Uint8Array): Uint8Array {
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const bitLen = message.length * 8;
  // Pad: 0x80, zeros, 64-bit big-endian length, to a multiple of 64 bytes.
  const paddedLen = (((message.length + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLen);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  // JS numbers hold up to 2^53; high word via division is exact for our sizes.
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const w = new Array<number>(64);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + hh) | 0;
  }

  const digest = new Uint8Array(32);
  const dv = new DataView(digest.buffer);
  for (let i = 0; i < 8; i++) dv.setUint32(i * 4, h[i] >>> 0, false);
  return digest;
}

function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

export function sha256Hex(data: string | Uint8Array): string {
  return toHex(sha256Bytes(typeof data === 'string' ? utf8Encode(data) : data));
}

export function hmacSha256(key: Uint8Array, data: string | Uint8Array): Uint8Array {
  const dataBytes = typeof data === 'string' ? utf8Encode(data) : data;
  let keyBytes = key;
  if (keyBytes.length > 64) keyBytes = sha256Bytes(keyBytes);
  const ipad = new Uint8Array(64 + dataBytes.length);
  const opad = new Uint8Array(64 + 32);
  for (let i = 0; i < 64; i++) {
    const k = i < keyBytes.length ? keyBytes[i] : 0;
    ipad[i] = k ^ 0x36;
    opad[i] = k ^ 0x5c;
  }
  ipad.set(dataBytes, 64);
  opad.set(sha256Bytes(ipad), 64);
  return sha256Bytes(opad);
}

// ---------------------------------------------------------------------------
// SigV4 signing
// ---------------------------------------------------------------------------

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface SignRequestOptions {
  host: string;
  region: string;
  service: string;
  /** X-Amz-Target header value, e.g. "DynamoDB_20120810.Query". */
  target: string;
  contentType: string;
  body: string;
  credentials: AwsCredentials;
  /** Injectable clock for deterministic tests. */
  date?: Date;
}

function amzDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Signs a JSON-RPC style AWS POST request (path "/", no query string) and
 * returns the headers to send. "host" is part of the signature but is NOT
 * returned: fetch forbids setting it and the runtime sends it automatically
 * with exactly the signed value.
 */
export function signAwsRequest(opts: SignRequestOptions): Record<string, string> {
  const date = opts.date ?? new Date();
  const longDate = amzDate(date);
  const shortDate = longDate.slice(0, 8);
  const { credentials } = opts;

  const headerEntries: [string, string][] = [
    ['content-type', opts.contentType],
    ['host', opts.host],
    ['x-amz-date', longDate],
  ];
  if (credentials.sessionToken)
    headerEntries.push(['x-amz-security-token', credentials.sessionToken]);
  headerEntries.push(['x-amz-target', opts.target]);
  headerEntries.sort((a, b) => (a[0] < b[0] ? -1 : 1));

  const canonicalHeaders = headerEntries.map(([k, v]) => `${k}:${v}\n`).join('');
  const signedHeaders = headerEntries.map(([k]) => k).join(';');
  const payloadHash = sha256Hex(opts.body);
  const canonicalRequest = ['POST', '/', '', canonicalHeaders, signedHeaders, payloadHash].join(
    '\n',
  );

  const scope = `${shortDate}/${opts.region}/${opts.service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', longDate, scope, sha256Hex(canonicalRequest)].join(
    '\n',
  );

  const kDate = hmacSha256(utf8Encode(`AWS4${credentials.secretAccessKey}`), shortDate);
  const kRegion = hmacSha256(kDate, opts.region);
  const kService = hmacSha256(kRegion, opts.service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = toHex(hmacSha256(kSigning, stringToSign));

  const headers: Record<string, string> = {
    'Content-Type': opts.contentType,
    'X-Amz-Date': longDate,
    'X-Amz-Target': opts.target,
    Authorization: `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
  if (credentials.sessionToken) headers['X-Amz-Security-Token'] = credentials.sessionToken;
  return headers;
}

// ---------------------------------------------------------------------------
// Fetch helper (hard timeout so sync can never hang the app)
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  try {
    return await fetch(url, { ...init, signal: controller?.signal });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Cognito guest credentials (unauthenticated identity pool)
// ---------------------------------------------------------------------------

export interface GuestCredentials extends AwsCredentials {
  identityId: string;
}

interface CachedCreds extends GuestCredentials {
  expiresAt: number;
}

let cachedIdentityId: string | null = null;
let cachedCreds: CachedCreds | null = null;
let inflightCreds: Promise<GuestCredentials> | null = null;

/** The Cognito identity id once known (used to highlight "your" row). */
export function getCachedIdentityId(): string | null {
  return cachedIdentityId;
}

/** Test-only reset of the module credential cache. */
export function resetAwsClientCacheForTests(): void {
  cachedIdentityId = null;
  cachedCreds = null;
  inflightCreds = null;
}

async function cognitoCall<T>(operation: string, payload: object): Promise<T> {
  const response = await fetchWithTimeout(`https://cognito-identity.${AWS_REGION}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityService.${operation}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Cognito ${operation} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

async function fetchGuestCredentials(): Promise<GuestCredentials> {
  // Reuse the identity id across sessions so the leaderboard key is stable.
  if (!cachedIdentityId) {
    cachedIdentityId = await AsyncStorage.getItem(IDENTITY_ID_STORAGE_KEY).catch(() => null);
  }
  if (!cachedIdentityId) {
    const { IdentityId } = await cognitoCall<{ IdentityId: string }>('GetId', {
      IdentityPoolId: IDENTITY_POOL_ID,
    });
    cachedIdentityId = IdentityId;
    AsyncStorage.setItem(IDENTITY_ID_STORAGE_KEY, IdentityId).catch(() => {});
  }

  interface CredsResponse {
    IdentityId: string;
    Credentials: {
      AccessKeyId: string;
      SecretKey: string;
      SessionToken: string;
      Expiration: number;
    };
  }

  let result: CredsResponse;
  try {
    result = await cognitoCall<CredsResponse>('GetCredentialsForIdentity', {
      IdentityId: cachedIdentityId,
    });
  } catch {
    // The stored identity may have been deleted server-side; mint a fresh one once.
    cachedIdentityId = null;
    AsyncStorage.removeItem(IDENTITY_ID_STORAGE_KEY).catch(() => {});
    const { IdentityId } = await cognitoCall<{ IdentityId: string }>('GetId', {
      IdentityPoolId: IDENTITY_POOL_ID,
    });
    cachedIdentityId = IdentityId;
    AsyncStorage.setItem(IDENTITY_ID_STORAGE_KEY, IdentityId).catch(() => {});
    result = await cognitoCall<CredsResponse>('GetCredentialsForIdentity', {
      IdentityId: cachedIdentityId,
    });
  }

  const creds: CachedCreds = {
    identityId: result.IdentityId,
    accessKeyId: result.Credentials.AccessKeyId,
    secretAccessKey: result.Credentials.SecretKey,
    sessionToken: result.Credentials.SessionToken,
    // Expiration is epoch seconds.
    expiresAt: result.Credentials.Expiration * 1000,
  };
  cachedIdentityId = result.IdentityId;
  cachedCreds = creds;
  return creds;
}

/** Cached Cognito guest credentials; refreshes shortly before expiry. */
export async function getGuestCredentials(): Promise<GuestCredentials> {
  if (cachedCreds && Date.now() < cachedCreds.expiresAt - CREDS_EXPIRY_BUFFER_MS) {
    return cachedCreds;
  }
  if (!inflightCreds) {
    inflightCreds = fetchGuestCredentials().finally(() => {
      inflightCreds = null;
    });
  }
  return inflightCreds;
}

// ---------------------------------------------------------------------------
// DynamoDB low-level call
// ---------------------------------------------------------------------------

/** Signed DynamoDB JSON API call, e.g. dynamoCall('PutItem', {...}). */
export async function dynamoCall<T>(operation: string, payload: object): Promise<T> {
  const credentials = await getGuestCredentials();
  const host = `dynamodb.${AWS_REGION}.amazonaws.com`;
  const body = JSON.stringify(payload);
  const headers = signAwsRequest({
    host,
    region: AWS_REGION,
    service: 'dynamodb',
    target: `DynamoDB_20120810.${operation}`,
    contentType: 'application/x-amz-json-1.0',
    body,
    credentials,
  });
  const response = await fetchWithTimeout(`https://${host}/`, {
    method: 'POST',
    headers,
    body,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `DynamoDB ${operation} failed with status ${response.status}: ${detail.slice(0, 200)}`,
    );
  }
  return (await response.json()) as T;
}
