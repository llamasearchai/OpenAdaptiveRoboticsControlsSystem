'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp?: number;
}

export interface UseWebSocketOptions<T = unknown> {
  url: string;
  onMessage?: (message: WebSocketMessage<T>) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  protocols?: string | string[];
}

export interface UseWebSocketReturn<T = unknown> {
  status: WebSocketStatus;
  lastMessage: WebSocketMessage<T> | null;
  send: (message: WebSocketMessage) => void;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket<T = unknown>(
  options: UseWebSocketOptions<T>
): UseWebSocketReturn<T> {
  const {
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
    protocols,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage<T> | null>(null);

  const clearTimers = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    clearTimers();
    setStatus('connecting');

    try {
      wsRef.current = new WebSocket(url, protocols);

      wsRef.current.onopen = () => {
        setStatus('connected');
        reconnectCountRef.current = 0;
        startHeartbeat();
        onOpen?.();
      };

      wsRef.current.onclose = () => {
        setStatus('disconnected');
        clearTimers();
        onClose?.();

        // Attempt reconnection
        if (reconnect && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current += 1;
          const delay = reconnectInterval * Math.pow(2, reconnectCountRef.current - 1);
          console.log(
            `WebSocket reconnecting in ${delay}ms (attempt ${reconnectCountRef.current}/${reconnectAttempts})`
          );

          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        setStatus('error');
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage<T>;

          // Handle pong messages silently
          if (message.type === 'pong') {
            return;
          }

          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setStatus('error');
    }
  }, [
    url,
    protocols,
    reconnect,
    reconnectAttempts,
    reconnectInterval,
    clearTimers,
    startHeartbeat,
    onOpen,
    onClose,
    onError,
    onMessage,
  ]);

  const disconnect = useCallback(() => {
    clearTimers();
    reconnectCountRef.current = reconnectAttempts; // Prevent reconnection

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('disconnected');
  }, [clearTimers, reconnectAttempts]);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, []);

  const subscribe = useCallback(
    (topic: string) => {
      send({ type: 'subscribe', payload: { topic } });
    },
    [send]
  );

  const unsubscribe = useCallback(
    (topic: string) => {
      send({ type: 'unsubscribe', payload: { topic } });
    },
    [send]
  );

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    lastMessage,
    send,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
  };
}

// Specialized hooks for simulation and training WebSockets

export function useSimulationWebSocket(sessionId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
  const url = `${baseUrl}/ws/simulation/${sessionId}`;

  return useWebSocket({
    url,
    onMessage: (message) => {
      // Handle simulation-specific messages
      switch (message.type) {
        case 'sim_state':
        case 'sim_observation':
        case 'sim_step':
        case 'sim_reset':
          // Update simulation store
          break;
        case 'error':
          console.error('Simulation error:', message.payload);
          break;
      }
    },
  });
}

export function useTrainingWebSocket(runId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
  const url = `${baseUrl}/ws/training/${runId}`;

  return useWebSocket({
    url,
    onMessage: (message) => {
      // Handle training-specific messages
      switch (message.type) {
        case 'train_metrics':
        case 'train_status':
        case 'train_checkpoint':
        case 'train_complete':
          // Update training store
          break;
        case 'error':
          console.error('Training error:', message.payload);
          break;
      }
    },
  });
}
