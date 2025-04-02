import { encodeStringToBase64 } from "../utils/base64";

export class SignalingConnection {
  private _socket: WebSocket;
  private _onAnswer: OnAnswer | null = null;

  private constructor(socket: WebSocket) {
    this._socket = socket;
  }

  /**
   * Connects to the signaling server.
   * @param url The URL of the signaling server.
   * @param info The client info to send to the server.
   * @param onMessage The callback to call when a message is received.
   * @param generateNewInfo The function to generate and publish a new info.
   * @param onClose The callback to call when the connection is closed.
   */
  public static async connect({
    url,
    info,
    onMessage,
    generateNewInfo,
    onClose,
  }: {
    url: string;
    info: ClientInfoWithoutId;
    onMessage: OnMessageCallback;
    generateNewInfo: () => Promise<ClientInfoWithoutId>;
    onClose: () => void;
  }): Promise<SignalingConnection> {
    console.log(`Connecting to ${url}`);

    const encodedInfo = encodeStringToBase64(JSON.stringify(info));
    const socket = await new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(`${url}?d=${encodedInfo}`);
      ws.onopen = () => resolve(ws);
      ws.onerror = (err) => reject(err);
    });

    // ping every 120 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
      socket.send("");
    }, 120 * 1000);

    // every half hour, generate a new fingerprint
    const fingerprintInterval = setInterval(
      async () => {
        const info = await generateNewInfo();
        socket.send(
          JSON.stringify({
            type: "UPDATE",
            info: info,
          } as WsClientUpdateMessage),
        );
      },
      30 * 60 * 1000,
    );

    socket.onclose = () => {
      console.log("Signaling connection closed");
      clearInterval(pingInterval);
      clearInterval(fingerprintInterval);
      onClose();
    };

    console.log("Signaling connection established");

    const instance = new SignalingConnection(socket);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as WsServerMessage;
      console.log(`WS in: ${event.data}`);
      if (
        message.type === "ANSWER" &&
        instance._onAnswer &&
        message.sessionId === instance._onAnswer.sessionId
      ) {
        instance._onAnswer.callback(message);
        instance._onAnswer = null;
      }
      onMessage(message);
    };

    return instance;
  }

  public send(message: WsClientMessage) {
    console.log(`WS out: ${JSON.stringify(message)}`);
    this._socket.send(JSON.stringify(message));
  }

  public async waitForAnswer(sessionId: string): Promise<AnswerMessage> {
    return await new Promise<AnswerMessage>((resolve) => {
      this._onAnswer = {
        sessionId,
        callback: (message) => resolve(message),
      };
    });
  }

  public async waitUntilClose(): Promise<void> {
    return new Promise((resolve) => {
      this._socket.addEventListener("close", () => {
        resolve();
      });
    });
  }

  /**
   * Closes the WebSocket connection.
   */
  public close(): void {
    if (this._socket.readyState === WebSocket.OPEN || 
        this._socket.readyState === WebSocket.CONNECTING) {
      this._socket.close();
    }
  }
}

type OnAnswer = {
  sessionId: string;
  callback: (message: AnswerMessage) => void;
};

export type ClientInfoWithoutId = {
  alias: string;
  version: string;
  deviceModel?: string;
  deviceType?: PeerDeviceType;
  token: string;
};

export type ClientInfo = ClientInfoWithoutId & { id: string };

export enum PeerDeviceType {
  mobile = "mobile",
  desktop = "desktop",
  web = "web",
  headless = "headless",
  server = "server",
}

export type WsServerMessage =
  | HelloMessage
  | JoinMessage
  | LeftMessage
  | UpdateMessage
  | OfferMessage
  | AnswerMessage
  | ErrorMessage;

export type HelloMessage = {
  type: "HELLO";
  client: ClientInfo;
  peers: ClientInfo[];
};

export type JoinMessage = {
  type: "JOIN";
  peer: ClientInfo;
};

export type UpdateMessage = {
  type: "UPDATE";
  peer: ClientInfo;
};

export type LeftMessage = {
  type: "LEFT";
  peerId: string;
};

export type WsServerSdpMessage = {
  peer: ClientInfo;
  sessionId: string;
  sdp: string;
};

export type OfferMessage = WsServerSdpMessage & { type: "OFFER" };

export type AnswerMessage = WsServerSdpMessage & { type: "ANSWER" };

export type ErrorMessage = {
  type: "ERROR";
  code: number;
};

type OnMessageCallback = (message: WsServerMessage) => void;

export type WsClientMessage = WsClientUpdateMessage | WsClientSdpMessage;

export type WsClientUpdateMessage = {
  type: "UPDATE";
  info: ClientInfoWithoutId;
};

export type WsClientSdpMessage = {
  type: "OFFER" | "ANSWER";
  sessionId: string;
  target: string;
  sdp: string;
};
