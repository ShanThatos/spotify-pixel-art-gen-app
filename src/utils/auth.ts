// src/utils/auth.ts

/**
 * Generates a cryptographically strong random string to be used as the PKCE code_verifier.
 * The verifier will be between 43 and 128 characters long.
 * Characters will be A-Z, a-z, 0-9, '-', '.', '_', '~'.
 */
export function generateCodeVerifier(length: number = 64): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
}

/**
 * Generates a PKCE code_challenge from a code_verifier.
 * The challenge is a SHA256 hash of the verifier, base64url encoded.
 * @param verifier The code_verifier string.
 * @returns A Promise that resolves to the base64url encoded SHA256 hash of the verifier.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);

  // Base64url encode the ArrayBuffer
  // 1. Convert ArrayBuffer to string of char codes
  // 2. btoa to base64 encode
  // 3. Replace URL-unsafe characters and remove padding
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
