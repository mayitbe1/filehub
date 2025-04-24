import { encodeBase64, decodeBase64 } from "../utils/base64";

// 检查是否在浏览器环境中
const isBrowser = typeof window !== 'undefined';

// 检查 Web Crypto API 是否可用
const isCryptoAvailable = isBrowser && window.crypto?.subtle;

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
  if (!isBrowser) {
    throw new Error('File hash calculation must be performed in the browser');
  }

  if (!isCryptoAvailable) {
    throw new Error('Web Crypto API is not available in this environment');
  }

  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Error calculating file hash:', error);
    throw new Error('Failed to calculate file hash: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// 生成16位签名
export function generateSignature(hash: string): string {
  if (!hash) {
    throw new Error('Hash is required to generate signature');
  }
  try {
    // 取哈希值的前16位作为签名
    return hash.substring(0, 16);
  } catch (error) {
    console.error('Error generating signature:', error);
    throw new Error('Failed to generate signature: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// 验证签名
export function verifySignature(hash: string, signature: string): boolean {
  if (!hash || !signature) {
    throw new Error('Hash and signature are required for verification');
  }
  try {
    // 检查签名是否为16位
    if (signature.length !== 16) {
      return false;
    }
    // 验证签名是否匹配
    return hash.substring(0, 16) === signature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
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

// 保存签名到本地存储
export function saveSignatureToLocal(hash: string, signature: string): void {
  if (!isBrowser) return;
  
  try {
    const signatureData = {
      hash,
      signature,
      timestamp: Date.now()
    };
    localStorage.setItem('fileSignature', JSON.stringify(signatureData));
  } catch (error) {
    console.error('Error saving signature to local storage:', error);
    throw new Error('Failed to save signature: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// 从本地存储获取签名
export function getSignatureFromLocal(): { hash: string; signature: string; timestamp: number } | null {
  if (!isBrowser) return null;
  
  try {
    const storedData = localStorage.getItem('fileSignature');
    return storedData ? JSON.parse(storedData) : null;
  } catch (error) {
    console.error('Error getting signature from local storage:', error);
    return null;
  }
} 