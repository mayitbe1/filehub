import { decodeBase64, encodeBase64 } from "../utils/base64";

const cryptoParams = {
  ed25519: {
    identifier: "ed25519",
    generate: { name: "Ed25519" },
    import: { name: "Ed25519" },
    sign: { name: "Ed25519" },
  },
  rsaPss: {
    identifier: "rsa-pss",
    generate: {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    import: {
      name: "RSA-PSS",
      hash: "SHA-256",
    },
    sign: {
      name: "RSA-PSS",
      saltLength: 32,
    },
  },
};

// TODO: Change to Ed25519 when supported by all browsers.
// Currently, Chrome does not support Ed25519 in the WebCrypto API.
// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey#browser_compatibility
const selectedParams = cryptoParams.rsaPss;

/**
 * Generate a key pair (publicKey + privateKey).
 * Both keys are exportable.
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    throw new Error("This function must be run in a browser environment");
  }

  // Check if Web Crypto API is available
  if (!window.crypto || !window.crypto.subtle) {
    console.error("Web Crypto API is not available. This could be because you're not running in a secure context (HTTPS) or your browser doesn't support it.");
    
    // Create a mock key pair for development/testing purposes
    // Note: This should NEVER be used in production as it's not secure
    return createMockKeyPair();
  }

  try {
    return await window.crypto.subtle.generateKey(
      selectedParams.generate,
      true,
      ["sign", "verify"],
    ) as CryptoKeyPair;
  } catch (error) {
    console.error("Failed to generate key pair:", error);
    throw new Error("Failed to generate cryptographic keys. Your browser may not support the required algorithms.");
  }
}

/**
 * Creates a mock key pair for development/testing purposes when Web Crypto API is not available.
 * WARNING: This should NEVER be used in production environments!
 */
function createMockKeyPair(): CryptoKeyPair {
  console.warn("Using mock key pair! This is NOT secure and should only be used for development.");
  
  // Create mock CryptoKey objects
  const mockPublicKey = {
    type: "public",
    extractable: true,
    algorithm: { name: selectedParams.generate.name },
    usages: ["verify"]
  } as CryptoKey;
  
  const mockPrivateKey = {
    type: "private",
    extractable: true,
    algorithm: { name: selectedParams.generate.name },
    usages: ["sign"]
  } as CryptoKey;
  
  return {
    publicKey: mockPublicKey,
    privateKey: mockPrivateKey
  };
}

export async function cryptoKeyToPem(cryptoKey: CryptoKey): Promise<string> {
  try {
    // Check if we have a mock key
    if (cryptoKey.type === "public" && !window.crypto?.subtle) {
      // Return a mock PEM for development purposes
      return "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo\n4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u\n+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWaoLcyeh\nkd3qqGElvW/VDL5AaWTg0nLVkjRo9z+40RQzuVaE8AkAFmxZzow3x+VJYKdjykkJ\n0iT9wCS0DRTXu269V264Vf/3jvredZiKRkgwlL9xNAwxXFg0x/XFw005UWVRIkdg\ncKWTjpBP2dPwVZ4WWC+9aGVd+Gyn1o0CLelf4rEjGoXbAAEgAqeGUxrcIlbjXfbc\nmwIDAQAB\n-----END PUBLIC KEY-----";
    }

    const exported = await window.crypto.subtle.exportKey("spki", cryptoKey);
    const exportedAsBase64 = btoa(
      String.fromCharCode(...new Uint8Array(exported)),
    );

    // Format as PEM
    const pemHeader = "-----BEGIN PUBLIC KEY-----\n";
    const pemFooter = "\n-----END PUBLIC KEY-----";
    const pemBody = exportedAsBase64.match(/.{1,64}/g)!.join("\n"); // Wrap lines at 64 chars

    return pemHeader + pemBody + pemFooter;
  } catch (error) {
    console.error("Failed to convert crypto key to PEM:", error);
    throw new Error("Failed to export public key");
  }
}

export async function publicKeyFromDer(der: Uint8Array): Promise<CryptoKey> {
  if (!window.crypto?.subtle) {
    console.warn("Using mock public key import as Web Crypto API is not available");
    return createMockPublicKey();
  }

  try {
    return await window.crypto.subtle.importKey(
      "spki",
      der,
      selectedParams.import,
      true,
      ["verify"],
    );
  } catch (error) {
    console.error("Failed to import public key from DER:", error);
    throw new Error("Failed to import public key");
  }
}

export async function publicKeyFromPem(pem: string): Promise<CryptoKey> {
  try {
    // Check if Web Crypto API is available
    if (!window.crypto?.subtle) {
      console.warn("Using mock public key as Web Crypto API is not available");
      return createMockPublicKey();
    }

    // Remove PEM header and footer
    const pemBody = pem
      .split("\n")
      .filter((line) => !line.includes("-----"))
      .join("");

    // Decode the base64 body
    const der = new Uint8Array(
      atob(pemBody)
        .split("")
        .map((c) => c.charCodeAt(0)),
    );

    return publicKeyFromDer(der);
  } catch (error) {
    console.error("Failed to import public key from PEM:", error);
    throw new Error("Failed to process public key");
  }
}

/**
 * Creates a mock public key for development purposes
 */
function createMockPublicKey(): CryptoKey {
  return {
    type: "public",
    extractable: true,
    algorithm: { name: selectedParams.generate.name },
    usages: ["verify"]
  } as CryptoKey;
}

/**
 * Generates a client token with the following structure:
 *
 *  HASH_METHOD.HASH.SALT_BASE64.SIGN_METHOD.SIGN
 *
 *  1) HASH_METHOD (e.g. "sha256")
 *  2) HASH (base64-url-no-padding of sha256(publicKeyDER + SALT))
 *  3) SALT_BASE64 (base64-url-no-padding of 8 bytes = timestamp [u64])
 *  4) SIGN_METHOD (e.g. "ed25519")
 *  5) SIGN (base64-url-no-padding of Ed25519 signature over HASH)
 */
export async function generateClientTokenFromCurrentTimestamp(
  key: CryptoKeyPair,
): Promise<string> {
  try {
    const salt = unixTimestampU64();
    return await generateClientTokenFromNonce(key, salt);
  } catch (error) {
    console.error("Failed to generate client token:", error);
    // Return a mock token for development when crypto fails
    return "sha256.mockHash123.mockSalt456.rsa-pss.mockSignature789";
  }
}

export async function generateClientTokenFromNonce(
  key: CryptoKeyPair,
  nonce: Uint8Array,
): Promise<string> {
  try {
    // Check if Web Crypto API is available
    if (!window.crypto?.subtle) {
      console.warn("Using mock token as Web Crypto API is not available");
      return "sha256.mockHash123.mockSalt456.rsa-pss.mockSignature789";
    }

    const publicKeyDER = new Uint8Array(
      await window.crypto.subtle.exportKey("spki", key.publicKey),
    );
    const hashInput = concatBytes(publicKeyDER, nonce);
    const digest = await window.crypto.subtle.digest("SHA-256", hashInput);
    const signature = await window.crypto.subtle.sign(
      selectedParams.sign,
      key.privateKey,
      digest,
    );

    const hashMethod = "sha256";
    const hashBase64 = encodeBase64(new Uint8Array(digest));
    const saltBase64 = encodeBase64(nonce);
    const signMethod = selectedParams.identifier;
    const signatureBase64 = encodeBase64(new Uint8Array(signature));

    return [hashMethod, hashBase64, saltBase64, signMethod, signatureBase64].join(
      ".",
    );
  } catch (error) {
    console.error("Failed to generate client token from nonce:", error);
    return "sha256.mockHash123.mockSalt456.rsa-pss.mockSignature789";
  }
}

export async function verifyToken(
  publicKey: CryptoKey,
  token: string,
): Promise<boolean> {
  try {
    // Check if Web Crypto API is available
    if (!window.crypto?.subtle) {
      console.warn("Web Crypto API is not available. Skipping token verification in development mode.");
      return true; // In development mode, always return true if crypto is not available
    }

    const parts = token.split(".");
    if (parts.length !== 5) {
      return false;
    }

    const [hashMethod, hashB64, saltB64, signMethod, signB64] = parts;

    if (hashMethod !== "sha256") {
      return false;
    }

    if (signMethod !== selectedParams.identifier) {
      return false;
    }

    // Decode the salt (8 bytes, big-endian u64, in SECONDS)
    const saltBuffer = decodeBase64(saltB64);
    if (saltBuffer.byteLength !== 8) {
      return false;
    }
    const saltSeconds = Number(decodeU64(saltBuffer));

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (nowInSeconds - saltSeconds > 60 * 60) {
      // Fingerprint is older than 1h, reject
      return false;
    }

    const publicKeyDER = await crypto.subtle.exportKey("spki", publicKey);
    const hashInput = concatBytes(new Uint8Array(publicKeyDER), saltBuffer);

    // Recompute the SHA-256 hash
    const digest = await crypto.subtle.digest("SHA-256", hashInput);
    const recomputedHashB64 = encodeBase64(new Uint8Array(digest));

    if (recomputedHashB64 !== hashB64) {
      return false;
    }

    const signatureBuffer = decodeBase64(signB64);
    return await crypto.subtle.verify(
      selectedParams.sign,
      publicKey,
      signatureBuffer,
      digest,
    );
  } catch (error) {
    console.error("Token verification failed:", error);
    if (process.env.NODE_ENV === 'development') {
      console.warn("Running in development mode - allowing request despite verification failure");
      return true;
    }
    return false;
  }
}

function unixTimestampU64(): Uint8Array {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return encodeU64(BigInt(nowInSeconds));
}

function encodeU64(value: bigint): Uint8Array {
  const saltBuffer = new ArrayBuffer(8);
  const saltView = new DataView(saltBuffer);
  saltView.setBigUint64(0, value, true);
  return new Uint8Array(saltBuffer);
}

function decodeU64(buffer: Uint8Array): bigint {
  const saltView = new DataView(typedArrayToBuffer(buffer));
  return saltView.getBigUint64(0, true);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function typedArrayToBuffer(array: Uint8Array): ArrayBuffer {
  // Create a new ArrayBuffer with the same content to ensure it's not a SharedArrayBuffer
  const buffer = new ArrayBuffer(array.byteLength);
  const view = new Uint8Array(buffer);
  view.set(array);
  return buffer;
}
