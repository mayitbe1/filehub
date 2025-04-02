"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ClientInfo, PeerDeviceType } from '@/services/signaling';
import { generateRandomAlias } from '@/utils/alias';
import { SessionState, startSendSession, setupConnection, useStore } from '@/services/store';
import { generateKeyPair, generateClientTokenFromCurrentTimestamp } from '@/services/crypto';
import PeerCard from './components_drop/PeerCard';
import SessionDialog from './components_drop/dialog/SessionDialog';
import { getUserAgent } from '@/utils/userAgent';
import DeviceNameEditor from './components_drop/DeviceNameEditor';

const DropPage = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isSecureContext, setIsSecureContext] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPeer, setSelectedPeer] = useState<ClientInfo | null>(null);
  const store = useStore();

  useEffect(() => {
    setIsSecureContext(typeof window !== 'undefined' && window.isSecureContext);

    const initialize = async () => {
      try {
        if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
          console.warn("Web Crypto API is not available. Using fallback implementation for development only.");
        }

        const keyPair = await generateKeyPair();
        store.key = keyPair;

        const userAgent = getUserAgent();
        const alias = generateRandomAlias();
        const token = await generateClientTokenFromCurrentTimestamp(keyPair);
        
        await setupConnection({
          info: {
            alias,
            version: "1.0",
            deviceModel: userAgent.browserName,
            deviceType: PeerDeviceType.web,
            token,
          },
          onPin: async () => null,
        });
        
        setIsInitialized(true);
      } catch (error) {
        console.error("Initialization error:", error);
        setInitError(error instanceof Error ? error.message : "Unknown initialization error");
      }
    };

    initialize();
  }, []);

  const handleDeviceClick = (peer: ClientInfo) => {
    setSelectedPeer(peer);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPeer || !event.target.files || event.target.files.length === 0) {
      return;
    }

    try {
      await startSendSession({
        files: event.target.files,
        targetId: selectedPeer.id,
        onPin: async () => null,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error sending files:", error);
    }
    setSelectedPeer(null);
  };

  const handleRefresh = async () => {
    try {
      if (store.signaling) {
        const oldSignaling = store.signaling;
        store.signaling = null;
        oldSignaling.close();
        
        if (!store.key || !store._proposingClient) {
          throw new Error("Connection information is missing");
        }
        
        const token = await generateClientTokenFromCurrentTimestamp(store.key);
        
        await setupConnection({
          info: {
            ...store._proposingClient,
            token,
          },
          onPin: async () => null,
        });
      }
    } catch (error) {
      console.error("Error refreshing device list:", error);
    }
  };

  return (
    <div className="page-container">
      <div className="flex w-full items-center justify-between">
        <h1 className="h1">File Transfer</h1>
        <div className="flex items-center gap-4">
          <Button className="primary-btn" onClick={handleRefresh}>
            {/* <Image
              src="/assets/icons/refresh.svg"
              alt="Refresh"
              width={24}
              height={24}
            /> */}
            <p>Refresh Devices</p>
          </Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 w-full">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Device Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <DeviceNameEditor />
            {!isSecureContext && (
              <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded">
                Warning: Running in an insecure context. For full functionality, please use HTTPS.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Available Devices</CardTitle>
          </CardHeader>
          <CardContent>
            {initError && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
                Error initializing: {initError}
              </div>
            )}

            {!isInitialized ? (
              <div className="text-center py-10">Initializing connection...</div>
            ) : store.peers.length === 0 ? (
              <div className="text-center py-10">No devices found in your network</div>
            ) : (
              <div className="space-y-3">
                {store.peers.map((peer: ClientInfo) => (
                  <PeerCard 
                    key={peer.id} 
                    peer={peer} 
                    onClick={() => handleDeviceClick(peer)} 
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      
      </div>

      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileSelect} 
        multiple 
      />

      {/* Session dialog that shows file transfer progress */}
      <SessionDialog />
    </div>
  );
};

export default DropPage; 