"""WebSocket handlers for real-time streaming."""

import asyncio
import logging
from uuid import uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends

from arcs.api.websocket.manager import (
    connection_manager,
    MessageType,
)
from arcs.api.services.simulation_service import SimulationService
from arcs.api.services.training_service import TrainingService

logger = logging.getLogger(__name__)

router = APIRouter()


def get_simulation_service() -> SimulationService:
    """Get simulation service instance."""
    return SimulationService()


def get_training_service() -> TrainingService:
    """Get training service instance."""
    return TrainingService()


@router.websocket("/simulation/{session_id}")
async def simulation_websocket(
    websocket: WebSocket,
    session_id: str,
) -> None:
    """WebSocket endpoint for real-time simulation state streaming.

    Message Types (Client -> Server):
    - subscribe: Subscribe to simulation updates
    - unsubscribe: Unsubscribe from updates
    - step: Execute a simulation step
    - reset: Reset the simulation
    - ping: Keep-alive ping

    Message Types (Server -> Client):
    - sim_state: Full simulation state
    - sim_observation: Observation update
    - sim_step: Step result
    - sim_reset: Reset confirmation
    - error: Error message
    - pong: Keep-alive response
    """
    connection_id = f"sim_{session_id}_{uuid4().hex[:8]}"
    service = SimulationService()

    # Verify session exists
    session = service.get_session(session_id)
    if not session:
        await websocket.close(code=4004, reason="Session not found")
        return

    connection = await connection_manager.connect(
        websocket,
        connection_id,
        metadata={"session_id": session_id, "type": "simulation"},
    )

    # Auto-subscribe to this session's topic
    topic = f"simulation:{session_id}"
    await connection_manager.subscribe(connection_id, topic)

    try:
        # Send initial state
        state = service.get_state(session_id)
        if state:
            state_dict = service.state_to_dict(state)
            await connection_manager.send_personal(
                connection_id,
                MessageType.SIM_STATE,
                state_dict,
            )

        # Message loop
        while True:
            try:
                message = await websocket.receive_json()
                await _handle_simulation_message(
                    connection_id,
                    session_id,
                    message,
                    service,
                )
            except WebSocketDisconnect:
                break

    except Exception as e:
        logger.exception(f"Simulation WebSocket error: {e}")
        await connection_manager.send_personal(
            connection_id,
            MessageType.ERROR,
            {"error": str(e)},
        )
    finally:
        await connection_manager.disconnect(connection_id)


async def _handle_simulation_message(
    connection_id: str,
    session_id: str,
    message: dict,
    service: SimulationService,
) -> None:
    """Handle incoming simulation WebSocket messages."""
    msg_type = message.get("type")
    data = message.get("data", {})

    if msg_type == "step":
        action = data.get("action")
        if not action:
            await connection_manager.send_personal(
                connection_id,
                MessageType.ERROR,
                {"error": "Action required for step"},
            )
            return

        try:
            obs, reward, terminated, truncated, info = service.step_session(
                session_id,
                action=action,
            )
            obs_dict = service.observation_to_dict(obs)

            result = {
                "observation": obs_dict,
                "reward": reward,
                "terminated": terminated,
                "truncated": truncated,
                "info": info,
            }

            # Send to requesting client
            await connection_manager.send_personal(
                connection_id,
                MessageType.SIM_STEP,
                result,
            )

            # Broadcast state update to all subscribers
            topic = f"simulation:{session_id}"
            await connection_manager.broadcast_to_topic(
                topic,
                MessageType.SIM_OBSERVATION,
                obs_dict,
                exclude={connection_id},
            )

        except ValueError as e:
            await connection_manager.send_personal(
                connection_id,
                MessageType.ERROR,
                {"error": str(e)},
            )

    elif msg_type == "reset":
        seed = data.get("seed")
        try:
            obs = service.reset_session(session_id, seed=seed)
            obs_dict = service.observation_to_dict(obs)

            await connection_manager.send_personal(
                connection_id,
                MessageType.SIM_RESET,
                {"observation": obs_dict},
            )

            # Broadcast reset to all subscribers
            topic = f"simulation:{session_id}"
            await connection_manager.broadcast_to_topic(
                topic,
                MessageType.SIM_RESET,
                {"observation": obs_dict},
                exclude={connection_id},
            )

        except ValueError as e:
            await connection_manager.send_personal(
                connection_id,
                MessageType.ERROR,
                {"error": str(e)},
            )

    elif msg_type == "get_state":
        try:
            state = service.get_state(session_id)
            if state:
                state_dict = service.state_to_dict(state)
                await connection_manager.send_personal(
                    connection_id,
                    MessageType.SIM_STATE,
                    state_dict,
                )
        except ValueError as e:
            await connection_manager.send_personal(
                connection_id,
                MessageType.ERROR,
                {"error": str(e)},
            )

    else:
        # Delegate to connection manager for built-in handlers
        await connection_manager.handle_message(connection_id, message)


@router.websocket("/training/{run_id}")
async def training_websocket(
    websocket: WebSocket,
    run_id: str,
) -> None:
    """WebSocket endpoint for real-time training metrics streaming.

    Message Types (Client -> Server):
    - subscribe: Subscribe to training updates
    - unsubscribe: Unsubscribe from updates
    - get_metrics: Request current metrics batch
    - ping: Keep-alive ping

    Message Types (Server -> Client):
    - train_metrics: Training metrics update
    - train_status: Training status change
    - train_checkpoint: Checkpoint saved notification
    - train_complete: Training completed
    - error: Error message
    - pong: Keep-alive response
    """
    connection_id = f"train_{run_id}_{uuid4().hex[:8]}"
    service = TrainingService()

    # Verify run exists
    run = service.get_run(run_id)
    if not run:
        await websocket.close(code=4004, reason="Run not found")
        return

    connection = await connection_manager.connect(
        websocket,
        connection_id,
        metadata={"run_id": run_id, "type": "training"},
    )

    # Auto-subscribe to this run's topic
    topic = f"training:{run_id}"
    await connection_manager.subscribe(connection_id, topic)

    # Start metrics streaming task
    streaming_task = asyncio.create_task(
        _stream_training_metrics(connection_id, run_id, service)
    )

    try:
        # Send initial status
        await connection_manager.send_personal(
            connection_id,
            MessageType.TRAIN_STATUS,
            {
                "run_id": run_id,
                "status": run.status,
                "current_step": run.current_step,
                "total_steps": run.total_steps,
            },
        )

        # Message loop
        while True:
            try:
                message = await websocket.receive_json()
                await _handle_training_message(
                    connection_id,
                    run_id,
                    message,
                    service,
                )
            except WebSocketDisconnect:
                break

    except Exception as e:
        logger.exception(f"Training WebSocket error: {e}")
        await connection_manager.send_personal(
            connection_id,
            MessageType.ERROR,
            {"error": str(e)},
        )
    finally:
        streaming_task.cancel()
        try:
            await streaming_task
        except asyncio.CancelledError:
            pass
        await connection_manager.disconnect(connection_id)


async def _stream_training_metrics(
    connection_id: str,
    run_id: str,
    service: TrainingService,
    interval: float = 1.0,
) -> None:
    """Background task to stream training metrics."""
    last_step = 0

    while True:
        try:
            await asyncio.sleep(interval)

            run = service.get_run(run_id)
            if not run:
                break

            # Check for new metrics
            if run.current_step > last_step:
                # Get new metrics since last check
                new_metrics = service.get_metrics(
                    run_id,
                    offset=last_step,
                    limit=run.current_step - last_step,
                )

                if new_metrics:
                    metrics_data = [
                        {
                            "step": m.step,
                            "policy_loss": m.policy_loss,
                            "value_loss": m.value_loss,
                            "kl": m.kl,
                            "entropy": m.entropy,
                            "explained_variance": m.explained_variance,
                            "episode_reward": m.episode_reward,
                            "episode_length": m.episode_length,
                            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
                        }
                        for m in new_metrics
                    ]

                    # Broadcast to all subscribers
                    topic = f"training:{run_id}"
                    await connection_manager.broadcast_to_topic(
                        topic,
                        MessageType.TRAIN_METRICS,
                        {"metrics": metrics_data},
                    )

                last_step = run.current_step

            # Check for status changes
            if run.status in ("completed", "failed", "stopped"):
                await connection_manager.broadcast_to_topic(
                    f"training:{run_id}",
                    MessageType.TRAIN_COMPLETE,
                    {
                        "run_id": run_id,
                        "status": run.status,
                        "final_step": run.current_step,
                        "error_message": run.error_message,
                    },
                )
                break

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Metrics streaming error: {e}")


async def _handle_training_message(
    connection_id: str,
    run_id: str,
    message: dict,
    service: TrainingService,
) -> None:
    """Handle incoming training WebSocket messages."""
    msg_type = message.get("type")
    data = message.get("data", {})

    if msg_type == "get_metrics":
        offset = data.get("offset", 0)
        limit = data.get("limit", 100)

        try:
            metrics = service.get_metrics(run_id, offset=offset, limit=limit)

            metrics_data = [
                {
                    "step": m.step,
                    "policy_loss": m.policy_loss,
                    "value_loss": m.value_loss,
                    "kl": m.kl,
                    "entropy": m.entropy,
                    "explained_variance": m.explained_variance,
                    "episode_reward": m.episode_reward,
                    "episode_length": m.episode_length,
                    "timestamp": m.timestamp.isoformat() if m.timestamp else None,
                }
                for m in metrics
            ]

            await connection_manager.send_personal(
                connection_id,
                MessageType.TRAIN_METRICS,
                {"metrics": metrics_data, "offset": offset, "limit": limit},
            )

        except ValueError as e:
            await connection_manager.send_personal(
                connection_id,
                MessageType.ERROR,
                {"error": str(e)},
            )

    elif msg_type == "get_status":
        run = service.get_run(run_id)
        if run:
            await connection_manager.send_personal(
                connection_id,
                MessageType.TRAIN_STATUS,
                {
                    "run_id": run_id,
                    "status": run.status,
                    "current_step": run.current_step,
                    "total_steps": run.total_steps,
                },
            )

    else:
        # Delegate to connection manager for built-in handlers
        await connection_manager.handle_message(connection_id, message)


# Helper functions for external broadcasting

async def broadcast_simulation_state(
    session_id: str,
    state: dict,
) -> int:
    """Broadcast simulation state to all subscribers.

    Args:
        session_id: Simulation session ID
        state: State data to broadcast

    Returns:
        Number of clients notified
    """
    topic = f"simulation:{session_id}"
    return await connection_manager.broadcast_to_topic(
        topic,
        MessageType.SIM_STATE,
        state,
    )


async def broadcast_training_metrics(
    run_id: str,
    metrics: dict,
) -> int:
    """Broadcast training metrics to all subscribers.

    Args:
        run_id: Training run ID
        metrics: Metrics data to broadcast

    Returns:
        Number of clients notified
    """
    topic = f"training:{run_id}"
    return await connection_manager.broadcast_to_topic(
        topic,
        MessageType.TRAIN_METRICS,
        metrics,
    )


async def broadcast_training_status(
    run_id: str,
    status: str,
    current_step: int,
    total_steps: int,
    error_message: str | None = None,
) -> int:
    """Broadcast training status change to all subscribers.

    Args:
        run_id: Training run ID
        status: New status
        current_step: Current training step
        total_steps: Total training steps
        error_message: Optional error message

    Returns:
        Number of clients notified
    """
    topic = f"training:{run_id}"
    return await connection_manager.broadcast_to_topic(
        topic,
        MessageType.TRAIN_STATUS,
        {
            "run_id": run_id,
            "status": status,
            "current_step": current_step,
            "total_steps": total_steps,
            "error_message": error_message,
        },
    )
