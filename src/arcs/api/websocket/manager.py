"""WebSocket connection manager for real-time streaming."""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any
from collections.abc import Callable, Awaitable

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionState(str, Enum):
    """WebSocket connection state."""

    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTING = "disconnecting"
    DISCONNECTED = "disconnected"


class MessageType(str, Enum):
    """WebSocket message types."""

    # Control messages
    PING = "ping"
    PONG = "pong"
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"
    ERROR = "error"

    # Simulation messages
    SIM_STATE = "sim_state"
    SIM_OBSERVATION = "sim_observation"
    SIM_STEP = "sim_step"
    SIM_RESET = "sim_reset"

    # Training messages
    TRAIN_METRICS = "train_metrics"
    TRAIN_STATUS = "train_status"
    TRAIN_CHECKPOINT = "train_checkpoint"
    TRAIN_COMPLETE = "train_complete"


@dataclass
class Connection:
    """Represents an active WebSocket connection."""

    websocket: WebSocket
    connection_id: str
    state: ConnectionState = ConnectionState.CONNECTING
    subscriptions: set[str] = field(default_factory=set)
    connected_at: datetime = field(default_factory=datetime.utcnow)
    last_ping: datetime | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


class ConnectionManager:
    """Manages WebSocket connections and message broadcasting.

    Features:
    - Connection tracking by ID and topic
    - Topic-based pub/sub
    - Heartbeat monitoring
    - Automatic reconnection handling
    - Rate limiting support
    """

    def __init__(
        self,
        heartbeat_interval: float = 30.0,
        max_connections_per_topic: int = 100,
    ) -> None:
        """Initialize connection manager.

        Args:
            heartbeat_interval: Seconds between heartbeat pings
            max_connections_per_topic: Maximum connections per topic
        """
        self.heartbeat_interval = heartbeat_interval
        self.max_connections_per_topic = max_connections_per_topic

        # Connection tracking
        self._connections: dict[str, Connection] = {}
        self._topic_connections: dict[str, set[str]] = {}

        # Message handlers
        self._message_handlers: dict[str, Callable[[str, dict], Awaitable[None]]] = {}

        # Background tasks
        self._heartbeat_task: asyncio.Task | None = None
        self._running = False

    @property
    def connection_count(self) -> int:
        """Get total number of active connections."""
        return len(self._connections)

    def get_topic_connections(self, topic: str) -> int:
        """Get number of connections for a topic."""
        return len(self._topic_connections.get(topic, set()))

    async def connect(
        self,
        websocket: WebSocket,
        connection_id: str,
        metadata: dict[str, Any] | None = None,
    ) -> Connection:
        """Accept a new WebSocket connection.

        Args:
            websocket: FastAPI WebSocket instance
            connection_id: Unique connection identifier
            metadata: Optional connection metadata

        Returns:
            Connection object
        """
        await websocket.accept()

        connection = Connection(
            websocket=websocket,
            connection_id=connection_id,
            state=ConnectionState.CONNECTED,
            metadata=metadata or {},
        )

        self._connections[connection_id] = connection

        logger.info(f"WebSocket connected: {connection_id}")

        return connection

    async def disconnect(self, connection_id: str) -> None:
        """Disconnect a WebSocket connection.

        Args:
            connection_id: Connection to disconnect
        """
        connection = self._connections.pop(connection_id, None)
        if not connection:
            return

        connection.state = ConnectionState.DISCONNECTED

        # Remove from all topics
        for topic in list(connection.subscriptions):
            await self.unsubscribe(connection_id, topic)

        try:
            await connection.websocket.close()
        except Exception:
            pass  # Already closed

        logger.info(f"WebSocket disconnected: {connection_id}")

    async def subscribe(self, connection_id: str, topic: str) -> bool:
        """Subscribe a connection to a topic.

        Args:
            connection_id: Connection ID
            topic: Topic to subscribe to

        Returns:
            True if subscribed successfully
        """
        connection = self._connections.get(connection_id)
        if not connection:
            return False

        # Check max connections per topic
        topic_conns = self._topic_connections.setdefault(topic, set())
        if len(topic_conns) >= self.max_connections_per_topic:
            logger.warning(f"Max connections reached for topic: {topic}")
            return False

        connection.subscriptions.add(topic)
        topic_conns.add(connection_id)

        logger.debug(f"Connection {connection_id} subscribed to {topic}")
        return True

    async def unsubscribe(self, connection_id: str, topic: str) -> bool:
        """Unsubscribe a connection from a topic.

        Args:
            connection_id: Connection ID
            topic: Topic to unsubscribe from

        Returns:
            True if unsubscribed successfully
        """
        connection = self._connections.get(connection_id)
        if not connection:
            return False

        connection.subscriptions.discard(topic)

        topic_conns = self._topic_connections.get(topic)
        if topic_conns:
            topic_conns.discard(connection_id)
            if not topic_conns:
                del self._topic_connections[topic]

        logger.debug(f"Connection {connection_id} unsubscribed from {topic}")
        return True

    async def send_personal(
        self,
        connection_id: str,
        message_type: MessageType,
        data: dict[str, Any],
    ) -> bool:
        """Send a message to a specific connection.

        Args:
            connection_id: Target connection
            message_type: Type of message
            data: Message payload

        Returns:
            True if sent successfully
        """
        connection = self._connections.get(connection_id)
        if not connection or connection.state != ConnectionState.CONNECTED:
            return False

        try:
            await connection.websocket.send_json({
                "type": message_type.value,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
            })
            return True
        except Exception as e:
            logger.error(f"Failed to send to {connection_id}: {e}")
            await self.disconnect(connection_id)
            return False

    async def broadcast_to_topic(
        self,
        topic: str,
        message_type: MessageType,
        data: dict[str, Any],
        exclude: set[str] | None = None,
    ) -> int:
        """Broadcast a message to all connections subscribed to a topic.

        Args:
            topic: Target topic
            message_type: Type of message
            data: Message payload
            exclude: Connection IDs to exclude

        Returns:
            Number of successful sends
        """
        topic_conns = self._topic_connections.get(topic, set())
        exclude = exclude or set()

        message = {
            "type": message_type.value,
            "topic": topic,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }

        success_count = 0
        disconnected = []

        for conn_id in topic_conns:
            if conn_id in exclude:
                continue

            connection = self._connections.get(conn_id)
            if not connection or connection.state != ConnectionState.CONNECTED:
                disconnected.append(conn_id)
                continue

            try:
                await connection.websocket.send_json(message)
                success_count += 1
            except Exception:
                disconnected.append(conn_id)

        # Clean up disconnected
        for conn_id in disconnected:
            await self.disconnect(conn_id)

        return success_count

    async def broadcast_all(
        self,
        message_type: MessageType,
        data: dict[str, Any],
        exclude: set[str] | None = None,
    ) -> int:
        """Broadcast a message to all connected clients.

        Args:
            message_type: Type of message
            data: Message payload
            exclude: Connection IDs to exclude

        Returns:
            Number of successful sends
        """
        exclude = exclude or set()

        message = {
            "type": message_type.value,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }

        success_count = 0
        disconnected = []

        for conn_id, connection in list(self._connections.items()):
            if conn_id in exclude:
                continue

            if connection.state != ConnectionState.CONNECTED:
                continue

            try:
                await connection.websocket.send_json(message)
                success_count += 1
            except Exception:
                disconnected.append(conn_id)

        # Clean up disconnected
        for conn_id in disconnected:
            await self.disconnect(conn_id)

        return success_count

    def register_handler(
        self,
        message_type: str,
        handler: Callable[[str, dict], Awaitable[None]],
    ) -> None:
        """Register a message handler.

        Args:
            message_type: Message type to handle
            handler: Async handler function (connection_id, data) -> None
        """
        self._message_handlers[message_type] = handler

    async def handle_message(
        self,
        connection_id: str,
        message: dict[str, Any],
    ) -> None:
        """Handle an incoming WebSocket message.

        Args:
            connection_id: Source connection
            message: Received message
        """
        msg_type = message.get("type")
        data = message.get("data", {})

        # Built-in handlers
        if msg_type == MessageType.PING.value:
            connection = self._connections.get(connection_id)
            if connection:
                connection.last_ping = datetime.utcnow()
            await self.send_personal(connection_id, MessageType.PONG, {})
            return

        if msg_type == MessageType.SUBSCRIBE.value:
            topic = data.get("topic")
            if topic:
                success = await self.subscribe(connection_id, topic)
                await self.send_personal(
                    connection_id,
                    MessageType.SUBSCRIBE,
                    {"topic": topic, "success": success},
                )
            return

        if msg_type == MessageType.UNSUBSCRIBE.value:
            topic = data.get("topic")
            if topic:
                success = await self.unsubscribe(connection_id, topic)
                await self.send_personal(
                    connection_id,
                    MessageType.UNSUBSCRIBE,
                    {"topic": topic, "success": success},
                )
            return

        # Custom handlers
        handler = self._message_handlers.get(msg_type)
        if handler:
            try:
                await handler(connection_id, data)
            except Exception as e:
                logger.error(f"Handler error for {msg_type}: {e}")
                await self.send_personal(
                    connection_id,
                    MessageType.ERROR,
                    {"error": str(e), "message_type": msg_type},
                )
        else:
            logger.warning(f"No handler for message type: {msg_type}")

    async def start_heartbeat(self) -> None:
        """Start the heartbeat monitoring task."""
        if self._running:
            return

        self._running = True
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        logger.info("WebSocket heartbeat started")

    async def stop_heartbeat(self) -> None:
        """Stop the heartbeat monitoring task."""
        self._running = False
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass
            self._heartbeat_task = None
        logger.info("WebSocket heartbeat stopped")

    async def _heartbeat_loop(self) -> None:
        """Background heartbeat loop."""
        while self._running:
            try:
                await asyncio.sleep(self.heartbeat_interval)

                # Send ping to all connections
                await self.broadcast_all(MessageType.PING, {})

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Heartbeat error: {e}")

    async def close_all(self) -> None:
        """Close all connections gracefully."""
        await self.stop_heartbeat()

        for conn_id in list(self._connections.keys()):
            await self.disconnect(conn_id)

        logger.info("All WebSocket connections closed")


# Global connection manager instance
connection_manager = ConnectionManager()
