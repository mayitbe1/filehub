import type {
  ClientInfo,
  ClientInfoWithoutId,
  WsServerMessage,
  WsServerSdpMessage,
} from "../services/signaling";
import { SignalingConnection } from "../services/signaling";
import {
  defaultStun,
  type FileDto,
  type FileProgress,
  receiveFiles,
  sendFiles,
} from "../services/webrtc";
import { generateClientTokenFromCurrentTimestamp } from "../services/crypto";
import { useEffect, useState } from "react";

export enum SessionState {
  idle = "idle",
  sending = "sending",
  receiving = "receiving",
}

export type FileState = {
  id: string;
  name: string;
  curr: number;
  total: number;
  state: "pending" | "skipped" | "sending" | "finished" | "error";
  error?: string;
};

// Define the store type for TypeScript
export type Store = {
  // Whether the connection loop has started
  _loopStarted: boolean;

  // Client information of the current user that we send to the server
  _proposingClient: ClientInfoWithoutId | null;

  _onPin: (() => Promise<string | null>) | null;

  // Public and private key pair for signing and verifying messages
  key: CryptoKeyPair | null;

  /// PIN code used before receiving or sending files
  pin: string | null;

  // Signaling connection to the server
  signaling: SignalingConnection | null;

  // Client information of the current user that we received from the server
  client: ClientInfo | null;

  // List of peers connected to the same room
  peers: ClientInfo[];

  // Current session information
  session: {
    state: SessionState;
    curr: number;
    total: number;
    fileState: Record<string, FileState>;
  };
};

// Export the store as a simple object
export const store: Store = {
  // Whether the connection loop has started
  _loopStarted: false,

  // Client information of the current user that we send to the server
  _proposingClient: null,

  _onPin: null,

  // Public and private key pair for signing and verifying messages
  key: null,

  /// PIN code used before receiving or sending files
  pin: null,

  // Signaling connection to the server
  signaling: null,

  // Client information of the current user that we received from the server
  client: null,

  // List of peers connected to the same room
  peers: [],

  // Current session information
  session: {
    state: SessionState.idle,
    curr: 0,
    total: 1, // Avoid division by zero
    fileState: {},
  },
};

// Create a simple mechanism to trigger React component updates
let listeners: (() => void)[] = [];

// Function to notify listeners about store changes
function notifyStoreChange() {
  listeners.forEach(listener => listener());
}

// Add the useStore hook for React components
export function useStore(): Store {
  const [, setTriggerRender] = useState(0);
  
  useEffect(() => {
    // Create a listener that will trigger component re-render
    const listener = () => setTriggerRender(prev => prev + 1);
    
    // Add listener to the list
    listeners.push(listener);
    
    // Set up polling to ensure UI updates even if no listeners are called
    const interval = setInterval(listener, 1000);
    
    // Cleanup function
    return () => {
      // Remove listener from the list
      listeners = listeners.filter(l => l !== listener);
      clearInterval(interval);
    };
  }, []);
  
  return store;
}

export async function setupConnection({
  info,
  onPin,
}: {
  info: ClientInfoWithoutId;
  onPin: () => Promise<string | null>;
}) {
  store._proposingClient = info;
  store._onPin = onPin;
  if (!store._loopStarted) {
    store._loopStarted = true;
    connectionLoop().then(() => console.log("Connection loop ended"));
  }
  notifyStoreChange();
}

async function connectionLoop() {
  while (true) {
    try {
      store.signaling = await SignalingConnection.connect({
        url: "wss://public.localsend.org/v1/ws",
        info: store._proposingClient!,
        onMessage: (data: WsServerMessage) => {
          switch (data.type) {
            case "HELLO":
              store.client = data.client;
              store.peers = data.peers;
              notifyStoreChange();
              break;
            case "JOIN":
              store.peers = [...store.peers, data.peer];
              notifyStoreChange();
              break;
            case "UPDATE":
              store.peers = store.peers.map((p) =>
                p.id === data.peer.id ? data.peer : p,
              );
              notifyStoreChange();
              break;
            case "LEFT":
              store.peers = store.peers.filter((p) => p.id !== data.peerId);
              notifyStoreChange();
              break;
            case "OFFER":
              acceptOffer({ offer: data, onPin: store._onPin! });
              break;
            case "ANSWER":
              break;
          }
        },
        generateNewInfo: async () => {
          const token = await generateClientTokenFromCurrentTimestamp(
            store.key!,
          );
          updateClientTokenState(token);
          return { ...store._proposingClient!, token };
        },
        onClose: () => {
          store.signaling = null;
          store.client = null;
          store.peers = [];
          notifyStoreChange();
        },
      });

      await store.signaling.waitUntilClose();
    } catch (error) {
      console.log("Retrying connection in 5 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait before retrying
    }
  }
}

export function updateAliasState(alias: string) {
  store._proposingClient!.alias = alias;
  store.client!.alias = alias;
  notifyStoreChange();
}

function updateClientTokenState(token: string) {
  store._proposingClient!.token = token;
  store.client!.token = token;
  notifyStoreChange();
}

const PIN_MAX_TRIES = 3;

export async function startSendSession({
  files,
  targetId,
  onPin,
}: {
  files: FileList;
  targetId: string;
  onPin: () => Promise<string | null>;
}): Promise<void> {
  store.session.state = SessionState.sending;
  const fileState: Record<string, FileState> = {};

  const fileDtoList = convertFileListToDto(files);
  const fileMap = fileDtoList.reduce(
    (acc, file) => {
      acc[file.id] = files[parseInt(file.id)];
      fileState[file.id] = {
        id: file.id,
        name: file.fileName,
        curr: 0,
        total: file.size,
        state: "pending",
      };
      return acc;
    },
    {} as Record<string, File>,
  );

  store.session.fileState = fileState;
  store.session.curr = 0;
  store.session.total = fileDtoList.reduce((acc, file) => acc + file.size, 0);
  notifyStoreChange();

  try {
    await sendFiles({
      signaling: store.signaling as SignalingConnection,
      stunServers: defaultStun,
      fileDtoList: fileDtoList,
      fileMap: fileMap,
      targetId: targetId,
      signingKey: store.key!,
      pin: store.pin ? { pin: store.pin, maxTries: PIN_MAX_TRIES } : undefined,
      onPin: onPin,
      onFilesSkip: (fileIds) => {
        for (const id of fileIds) {
          store.session.fileState[id].state = "skipped";
        }
        notifyStoreChange();
      },
      onFileProgress: onFileProgress,
    });
  } finally {
    store.session.state = SessionState.idle;
    notifyStoreChange();
  }
}

function convertFileListToDto(files: FileList): FileDto[] {
  const result: FileDto[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    result.push({
      id: i.toString(),
      fileName: file.name,
      size: file.size,
      fileType: file.type,
      metadata: {
        modified: new Date(file.lastModified).toISOString(),
      },
    });
  }

  return result;
}

export async function acceptOffer({
  offer,
  onPin,
}: {
  offer: WsServerSdpMessage;
  onPin: () => Promise<string | null>;
}) {
  store.session.state = SessionState.receiving;
  notifyStoreChange();

  try {
    await receiveFiles({
      signaling: store.signaling as SignalingConnection,
      stunServers: defaultStun,
      offer: offer,
      signingKey: store.key!,
      pin: store.pin ? { pin: store.pin, maxTries: PIN_MAX_TRIES } : undefined,
      onPin: onPin,
      selectFiles: async (files) => {
        // Select all files
        store.session.curr = 0;
        store.session.total = files.reduce((acc, file) => acc + file.size, 0);
        store.session.fileState = {};
        for (const file of files) {
          store.session.fileState[file.id] = {
            id: file.id,
            name: file.fileName,
            curr: 0,
            total: file.size,
            state: "pending",
          };
        }
        notifyStoreChange();
        return files.map((file) => file.id);
      },
      onFileProgress: onFileProgress,
    });
  } finally {
    store.session.state = SessionState.idle;
    notifyStoreChange();
  }
}

function onFileProgress(progress: FileProgress) {
  store.session.fileState[progress.id].curr = progress.curr;
  store.session.curr = Object.values(store.session.fileState).reduce(
    (acc, file) => acc + file.curr,
    0,
  );
  if (progress.success) {
    store.session.fileState[progress.id].state = "finished";
  } else if (progress.error) {
    store.session.fileState[progress.id].state = "error";
    store.session.fileState[progress.id].error = progress.error;
  }
  notifyStoreChange();
}
