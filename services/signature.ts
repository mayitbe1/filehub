import { encodeBase64, decodeBase64 } from "../utils/base64";

// 生成RSA密钥对
export async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );
}

// 计算文件的SHA-256哈希
export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 生成16位签名
export function generateSignature(hash: string): string {
  // 取哈希值的前16位作为签名
  return hash.substring(0, 16);
}

// 验证签名
export function verifySignature(hash: string, signature: string): boolean {
  // 检查签名是否为16位
  if (signature.length !== 16) {
    return false;
  }
  // 验证签名是否匹配
  return hash.substring(0, 16) === signature;
}

// 使用私钥对哈希值进行签名
export async function signHash(hash: string, privateKey: CryptoKey): Promise<string> {
  const hashBuffer = decodeBase64(hash);
  const signature = await crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    privateKey,
    hashBuffer
  );
  return encodeBase64(new Uint8Array(signature));
}

// 导出公钥为Base64格式
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  return encodeBase64(new Uint8Array(exported));
}

// 导入Base64格式的公钥
export async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  const publicKeyBuffer = decodeBase64(publicKeyBase64);
  return await crypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    {
      name: "RSA-PSS",
      hash: "SHA-256",
    },
    true,
    ["verify"]
  );
} 