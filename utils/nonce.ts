export async function generateNonce(): Promise<Uint8Array> {
  const nonce = new Uint8Array(32);
  window.crypto.getRandomValues(nonce);
  return nonce;
}

export function validateNonce(nonce: Uint8Array): boolean {
  return nonce.byteLength >= 16 && nonce.byteLength <= 128;
}
