"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

const SignaturePage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [verificationHash, setVerificationHash] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleGenerateSignature = () => {
    // TODO: Implement signature generation
    console.log("Generating signature for:", selectedFile);
  };

  const handleVerify = () => {
    // TODO: Implement verification
    console.log("Verifying with hash:", verificationHash);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-8">File Signature and Verification</h1>

      {/* Generate Signature Section */}
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
        </CardContent>
      </Card>

      {/* Verify Signature Section */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">Verify Signature</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Time Stamp or upload file"
                value={verificationHash}
                onChange={(e) => setVerificationHash(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline">
                <Image
                  src="/assets/icons/upload.svg"
                  alt="Upload"
                  width={20}
                  height={20}
                />
              </Button>
            </div>
            <Button 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleVerify}
            >
              Verify
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignaturePage; 