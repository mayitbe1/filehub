import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SIGNATURE_DIR = path.join(process.cwd(), 'public/signatures');

// 确保签名目录存在
const ensureSignatureDir = () => {
  if (!fs.existsSync(SIGNATURE_DIR)) {
    fs.mkdirSync(SIGNATURE_DIR, { recursive: true });
  }
};

// 保存签名信息
const saveSignature = (fileHash: string, signature: string) => {
  ensureSignatureDir();
  const signaturePath = path.join(SIGNATURE_DIR, `${fileHash}.json`);
  const signatureData = {
    hash: fileHash,
    signature,
    timestamp: Date.now()
  };
  fs.writeFileSync(signaturePath, JSON.stringify(signatureData));
};

// 获取签名信息
const getSignature = (fileHash: string) => {
  const signaturePath = path.join(SIGNATURE_DIR, `${fileHash}.json`);
  if (!fs.existsSync(signaturePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(signaturePath, 'utf-8'));
};

export async function POST(request: Request) {
  try {
    const { hash, signature } = await request.json();
    
    if (!hash || !signature) {
      return NextResponse.json(
        { error: 'Hash and signature are required' },
        { status: 400 }
      );
    }

    // 验证签名格式
    if (signature.length !== 16) {
      return NextResponse.json(
        { error: 'Signature must be 16 characters long' },
        { status: 400 }
      );
    }

    saveSignature(hash, signature);

    return NextResponse.json(
      { 
        message: 'Signature saved successfully',
        hash,
        signature
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving signature:', error);
    return NextResponse.json(
      { error: 'Failed to save signature' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash');
    
    if (!hash) {
      return NextResponse.json(
        { error: 'Hash parameter is required' },
        { status: 400 }
      );
    }

    const signatureData = getSignature(hash);
    if (!signatureData) {
      return NextResponse.json(
        { error: 'Signature not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(signatureData, { status: 200 });
  } catch (error) {
    console.error('Error retrieving signature:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve signature' },
      { status: 500 }
    );
  }
} 