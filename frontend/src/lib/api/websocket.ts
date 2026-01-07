/**
 * WebSocket client for real-time streaming.
 */

import type {
  WebSocketMessage,
  WebSocketMessageType,
  ConnectionState,
} from '@/types';
import { WebSocketError } from './errors';
import { WS } from './endpoints';

/** WebSocket event handlers */
export interface WebSocketHandlers<T = unknown> {
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  onError?: (error: WebSocketError) => void;
  onMessage?: (message: WebSocketMessage<T>) => void;
  onStateChange?: (state: ConnectionState) => void;
}

/** WebSocket client options */
export interface WebSocketClientOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

const DEFAULT_OPTIONS: Required<WebSocketClientOptions> = {
  reconnect: true,
  reconnectInterval: 1000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
};

/** WebSocket client class */
export class WebSocketClient<T = unknown> {
  private url: string;
  private socket: WebSocket | null = null;
  private handlers: WebSocketHandlers<T>;
  private options: Required<WebSocketClientOptions>;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private subscriptions: Set<string> = new Set();

  constructor(
    url: string,
    handlers: WebSocketHandlers<T> = {},
    options: WebSocketClientOptions = {}
  ) {
    this.url = url;
    this.handlers = handlers;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /** Get current connection state */
  get connectionState(): ConnectionState {
    return this.state;
  }

  /** Check if connected */
  get isConnected(): boolean {
    return this.state === 'connected' && this.socket?.readyState === WebSocket.OPEN;
  }

  /** Connect to WebSocket server */
  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setState('connecting');

    try {
      // Build WebSocket URL
      const wsUrl = this.buildWsUrl(this.url);
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      const wsError = new WebSocketError(
        error instanceof Error ? error.message : 'Failed to connect'
      );
      this.handlers.onError?.(wsError);
      this.scheduleReconnect();
    }
  }

  /** Disconnect from WebSocket server */
  disconnect(): void {
    this.setState('disconnecting');
    this.clearTimers();
    this.reconnectAttempts = 0;

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.setState('disconnected');
  }

  /** Send a message */
  send(type: WebSocketMessageType | string, data: unknown = {}): boolean {
    if (!this.isConnected) {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }

    try {
      this.socket!.send(
        JSON.stringify({
          type,
          data,
        })
      );
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  /** Subscribe to a topic */
  subscribe(topic: string): boolean {
    if (this.subscriptions.has(topic)) {
      return true;
    }

    const sent = this.send('subscribe', { topic });
    if (sent) {
      this.subscriptions.add(topic);
    }
    return sent;
  }

  /** Unsubscribe from a topic */
  unsubscribe(topic: string): boolean {
    if (!this.subscriptions.has(topic)) {
      return true;
    }

    const sent = this.send('unsubscribe', { topic });
    if (sent) {
      this.subscriptions.delete(topic);
    }
    return sent;
  }

  /** Update handlers */
  setHandlers(handlers: Partial<WebSocketHandlers<T>>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /** Build WebSocket URL */
  private buildWsUrl(path: string): string {
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

    const url = new URL(path, baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  }

  /** Set connection state */
  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.handlers.onStateChange?.(state);
    }
  }

  /** Handle WebSocket open event */
  private handleOpen(): void {
    this.setState('connected');
    this.reconnectAttempts = 0;
    this.startHeartbeat();

    // Resubscribe to topics
    this.subscriptions.forEach((topic) => {
      this.send('subscribe', { topic });
    });

    this.handlers.onOpen?.();
  }

  /** Handle WebSocket close event */
  private handleClose(event: CloseEvent): void {
    this.clearTimers();
    this.setState('disconnected');
    this.handlers.onClose?.(event.code, event.reason);

    // Attempt reconnection if not a normal closure
    if (event.code !== 1000 && this.options.reconnect) {
      this.scheduleReconnect();
    }
  }

  /** Handle WebSocket error event */
  private handleError(): void {
    const error = new WebSocketError('WebSocket connection error');
    this.handlers.onError?.(error);
  }

  /** Handle WebSocket message event */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage<T>;

      // Handle pong messages internally
      if (message.type === 'pong') {
        return;
      }

      this.handlers.onMessage?.(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /** Start heartbeat timer */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send('ping', {});
    }, this.options.heartbeatInterval);
  }

  /** Schedule reconnection */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached');
      return;
    }

    const delay =
      this.options.reconnectInterval * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connect();
    }, delay);
  }

  /** Clear all timers */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

/** Create simulation WebSocket client */
export function createSimulationWebSocket(
  sessionId: string,
  handlers: WebSocketHandlers = {},
  options: WebSocketClientOptions = {}
): WebSocketClient {
  return new WebSocketClient(WS.SIMULATION(sessionId), handlers, options);
}

/** Create training WebSocket client */
export function createTrainingWebSocket(
  runId: string,
  handlers: WebSocketHandlers = {},
  options: WebSocketClientOptions = {}
): WebSocketClient {
  return new WebSocketClient(WS.TRAINING(runId), handlers, options);
}
