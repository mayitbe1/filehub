"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const SignaturePage = () => {
  return (
    <div className="page-container">
      <div className="flex w-full items-center justify-between">
        <h1 className="h1">File Signature</h1>
        <div className="flex items-center gap-4">
          <Button className="primary-btn">
            <Image
              src="/assets/icons/upload.svg"
              alt="Verify"
              width={24}
              height={24}
            />
            <p>Verify File</p>
          </Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* File Verification */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>File Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Verification Item */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Image
                      src="/assets/icons/file-document.svg"
                      alt="File"
                      width={24}
                      height={24}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">document.pdf</h3>
                    <p className="text-sm text-green-500">✓ Verified</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">2.5 MB</p>
                  <p className="text-sm text-gray-500">2 minutes ago</p>
                </div>
              </div>

              {/* More verification items would go here */}
            </div>
          </CardContent>
        </Card>

        {/* Signature History */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Signature History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Signature Item */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Image
                      src="/assets/icons/signature.svg"
                      alt="Signature"
                      width={24}
                      height={24}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">document.pdf</h3>
                    <p className="text-sm text-gray-500">SHA-256</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">2.5 MB</p>
                  <p className="text-sm text-gray-500">2 minutes ago</p>
                </div>
              </div>

              {/* More signature items would go here */}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignaturePage; 