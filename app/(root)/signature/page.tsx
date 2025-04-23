"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import { 
  calculateFileHash, 
  generateSignature,
  verifySignature
} from "@/services/signature";

interface SignatureData {
  hash: string;
  signature: string;
  timestamp: number;
}

const SignaturePage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [inputSignature, setInputSignature] = useState("");
  const [activeTab, setActiveTab] = useState<'signature' | 'ksi'>('signature');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setSignatureData(null);
      setVerificationResult(null);
      setInputSignature("");
    }
  };

  const handleGenerateSignature = async () => {
    if (!selectedFile) {
      toast({
        description: "Please select a file first",
        className: "error-toast",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // 计算文件哈希
      const hash = await calculateFileHash(selectedFile);
      
      // 生成16位签名
      const signature = generateSignature(hash);
      
      // 保存签名信息
      const response = await fetch('/api/signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hash, signature }),
      });

      if (!response.ok) {
        throw new Error('Failed to save signature');
      }

      const data = await response.json();
      setSignatureData({
        hash: data.hash,
        signature: data.signature,
        timestamp: Date.now()
      });

      toast({
        description: "Signature generated successfully",
        className: "success-toast",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        description: "Failed to generate signature",
        className: "error-toast",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySignature = async () => {
    if (!selectedFile || !inputSignature) {
      toast({
        description: "Please select a file and enter a signature",
        className: "error-toast",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // 重新计算文件哈希
      const currentHash = await calculateFileHash(selectedFile);
      
      // 验证签名
      const isValid = verifySignature(currentHash, inputSignature);
      
      setVerificationResult(isValid);
      
      toast({
        description: isValid ? "Signature is valid" : "Signature is invalid",
        className: isValid ? "success-toast" : "error-toast",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        description: "Failed to verify signature",
        className: "error-toast",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-8">File Signature</h1>

      <div className="flex gap-4 mb-8">
        <Button
          className={`flex-1 ${activeTab === 'signature' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
          onClick={() => setActiveTab('signature')}
        >
          Signature
        </Button>
        <Button
          className={`flex-1 ${activeTab === 'ksi' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
          onClick={() => setActiveTab('ksi')}
        >
          KSI
        </Button>
      </div>

      {activeTab === 'signature' ? (
        <>
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Generate Signature</h2>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                <div className="flex flex-col items-center justify-center">
                  <Image
                    src="/assets/icons/file-document.svg"
                    alt="Upload"
                    width={40}
                    height={40}
                    className="mb-4"
                  />
                  <p className="text-gray-600 mb-4">Drag and drop your file here, or click to select</p>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="fileInput"
                  />
                  <Button
                    onClick={() => document.getElementById('fileInput')?.click()}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Select File
                  </Button>
                  {selectedFile && (
                    <p className="mt-2 text-sm text-gray-600">{selectedFile.name}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <Button 
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleGenerateSignature}
                  disabled={!selectedFile || isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Image
                        src="/assets/icons/loader.svg"
                        alt="Loading"
                        width={20}
                        height={20}
                        className="animate-spin"
                      />
                      Processing...
                    </div>
                  ) : (
                    "Generate Signature"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {signatureData && (
            <Card className="mb-8">
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">Signature Information</h2>
                <div className="space-y-2">
                  <p><span className="font-medium">File Hash:</span> {signatureData.hash}</p>
                  <p><span className="font-medium">Signature:</span> {signatureData.signature}</p>
                  <p><span className="font-medium">Timestamp:</span> {new Date(signatureData.timestamp).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Verify Signature</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Enter Signature (16 characters)</label>
                  <Input
                    type="text"
                    value={inputSignature}
                    onChange={(e) => setInputSignature(e.target.value)}
                    placeholder="Enter 16-character signature"
                    maxLength={16}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-center">
                  <Button 
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    onClick={handleVerifySignature}
                    disabled={!selectedFile || !inputSignature || isLoading}
                  >
                    Verify Signature
                  </Button>
                </div>
                {verificationResult !== null && (
                  <p className={`text-center font-medium ${verificationResult ? 'text-green-600' : 'text-red-600'}`}>
                    Verification Status: {verificationResult ? 'Valid' : 'Invalid'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">KSI Verification</h2>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center justify-center">
                <Image
                  src="/assets/icons/file-document.svg"
                  alt="Upload"
                  width={40}
                  height={40}
                  className="mb-4"
                />
                <p className="text-gray-600 mb-4">Drag and drop your file here, or click to select</p>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="ksiFileInput"
                />
                <Button
                  onClick={() => document.getElementById('ksiFileInput')?.click()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Select File
                </Button>
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600">{selectedFile.name}</p>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <Button 
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!selectedFile || isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Image
                      src="/assets/icons/loader.svg"
                      alt="Loading"
                      width={20}
                      height={20}
                      className="animate-spin"
                    />
                    Processing...
                  </div>
                ) : (
                  "Verify with KSI"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SignaturePage; 