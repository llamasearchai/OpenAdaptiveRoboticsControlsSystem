#!/usr/bin/env python3
"""Start both backend and frontend services on free ports."""

import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional


def find_free_port(start_port: int = 8000, max_attempts: int = 100) -> int:
    """Find a free port starting from start_port."""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"Could not find a free port starting from {start_port}")


def start_backend(port: int, frontend_port: int) -> subprocess.Popen:
    """Start the FastAPI backend server."""
    env = os.environ.copy()
    env["ARCS_API_PORT"] = str(port)
    env["ARCS_API_HOST"] = "0.0.0.0"
    env["ARCS_API_RELOAD"] = "false"
    env["ARCS_API_DEBUG"] = "true"
    
    # Update CORS to allow the frontend port
    cors_origins = f"http://localhost:{frontend_port},http://127.0.0.1:{frontend_port}"
    env["ARCS_API_CORS_ORIGINS"] = cors_origins
    
    # Use the virtual environment's Python if available, otherwise use python3
    venv_python = Path(__file__).parent / ".venv" / "bin" / "python"
    if venv_python.exists():
        python_cmd = str(venv_python)
    elif subprocess.run(["which", "python3"], capture_output=True).returncode == 0:
        python_cmd = "python3"
    else:
        python_cmd = sys.executable
    cmd = [python_cmd, "-m", "uvicorn", "arcs.api.main:app", "--host", "0.0.0.0", "--port", str(port)]
    
    print(f"Starting backend on port {port}...")
    print(f"Using Python: {python_cmd}")
    print(f"Command: {' '.join(cmd)}")
    try:
        process = subprocess.Popen(
            cmd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=str(Path(__file__).parent)
        )
        # Give it a moment to start and check if it's still alive
        time.sleep(1)
        if process.poll() is not None:
            # Process exited immediately, read the error
            output, _ = process.communicate()
            print(f"Backend failed to start. Error: {output}", file=sys.stderr)
            raise RuntimeError(f"Backend process exited with code {process.returncode}")
        return process
    except Exception as e:
        print(f"Error starting backend: {e}", file=sys.stderr)
        raise


def start_frontend(port: int, backend_port: int) -> subprocess.Popen:
    """Start the Next.js frontend server."""
    frontend_dir = Path(__file__).parent / "frontend"
    
    if not frontend_dir.exists():
        raise RuntimeError(f"Frontend directory not found: {frontend_dir}")
    
    env = os.environ.copy()
    env["PORT"] = str(port)
    # Set backend URL for frontend to connect to
    env["NEXT_PUBLIC_API_URL"] = f"http://localhost:{backend_port}"
    
    # Check if pnpm is available, otherwise use npm
    if subprocess.run(["which", "pnpm"], capture_output=True).returncode == 0:
        cmd = ["pnpm", "dev", "--port", str(port)]
    elif subprocess.run(["which", "npm"], capture_output=True).returncode == 0:
        cmd = ["npm", "run", "dev", "--", "-p", str(port)]
    else:
        raise RuntimeError("Neither pnpm nor npm found. Please install one of them.")
    
    print(f"Starting frontend on port {port}...")
    process = subprocess.Popen(
        cmd,
        cwd=str(frontend_dir),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    return process


def wait_for_service(port: int, service_name: str, timeout: int = 30) -> bool:
    """Wait for a service to become available on the given port."""
    print(f"Waiting for {service_name} to start on port {port}...")
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                result = s.connect_ex(("localhost", port))
                if result == 0:
                    print(f"{service_name} is ready on port {port}")
                    return True
        except Exception:
            pass
        time.sleep(0.5)
    
    print(f"Warning: {service_name} did not become available within {timeout} seconds")
    return False


def main():
    """Main entry point."""
    print("Finding free ports...")
    
    # Find free ports (starting from different defaults)
    backend_port = find_free_port(9000)
    frontend_port = find_free_port(4000)
    
    # Ensure frontend port is different from backend
    if frontend_port == backend_port:
        frontend_port = find_free_port(backend_port + 1)
    
    print(f"Backend will run on port {backend_port}")
    print(f"Frontend will run on port {frontend_port}")
    print()
    
    backend_process = None
    frontend_process = None
    
    try:
        # Start backend (pass frontend port for CORS configuration)
        backend_process = start_backend(backend_port, frontend_port)
        
        # Wait a bit for backend to start
        time.sleep(2)
        
        # Start frontend
        frontend_process = start_frontend(frontend_port, backend_port)
        
        # Wait for services to be ready
        backend_ready = wait_for_service(backend_port, "Backend", timeout=30)
        frontend_ready = wait_for_service(frontend_port, "Frontend", timeout=60)
        
        print()
        print("=" * 60)
        print("Services started successfully!")
        print("=" * 60)
        print(f"Backend API:  http://localhost:{backend_port}")
        print(f"Backend Docs: http://localhost:{backend_port}/docs")
        print(f"Frontend:     http://localhost:{frontend_port}")
        print()
        print("Press Ctrl+C to stop all services")
        print("=" * 60)
        print()
        
        # Keep processes running and stream output
        import threading
        
        def stream_output(process: subprocess.Popen, name: str):
            """Stream output from a process in a separate thread."""
            if process.stdout:
                try:
                    for line in iter(process.stdout.readline, ""):
                        if line:
                            print(f"[{name}] {line.rstrip()}")
                except Exception:
                    pass
        
        # Start output streaming threads
        backend_thread = threading.Thread(
            target=stream_output, args=(backend_process, "Backend"), daemon=True
        )
        frontend_thread = threading.Thread(
            target=stream_output, args=(frontend_process, "Frontend"), daemon=True
        )
        backend_thread.start()
        frontend_thread.start()
        
        # Keep main thread alive and monitor processes
        while True:
            # Check if processes are still alive
            if backend_process.poll() is not None:
                print(f"\nBackend process exited with code {backend_process.returncode}")
                break
            if frontend_process.poll() is not None:
                print(f"\nFrontend process exited with code {frontend_process.returncode}")
                break
            
            time.sleep(1)
    
    except KeyboardInterrupt:
        print("\nShutting down services...")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        # Cleanup
        if backend_process:
            backend_process.terminate()
            try:
                backend_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                backend_process.kill()
        
        if frontend_process:
            frontend_process.terminate()
            try:
                frontend_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                frontend_process.kill()
        
        print("All services stopped.")


if __name__ == "__main__":
    main()
