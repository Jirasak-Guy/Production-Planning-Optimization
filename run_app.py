import subprocess
import os
import sys
import time

def get_python_executable(backend_dir):
    """
    Determine the correct Python executable to use.
    Prefer the virtual environment in Backend/.venv if it exists.
    """
    venv_python = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
    if os.path.exists(venv_python):
        print(f"Using virtual environment python: {venv_python}")
        return venv_python
    
    # Fallback to the current system python
    print(f"Using system python: {sys.executable}")
    return sys.executable

def main():
    # Root directory of the project
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "Backend")
    frontend_dir = os.path.join(root_dir, "Frontend")

    print("==================================================")
    print("   Starting Next-React-CSI App (Backend + Frontend)")
    print("==================================================")

    # 1. Start Backend
    print(f"\n[Backend] Starting from {backend_dir}...")
    python_exec = get_python_executable(backend_dir)
    
    backend_process = subprocess.Popen(
        [python_exec, "main.py"],
        cwd=backend_dir,
        shell=False # Direct execution is safer/cleaner when possible
    )

    # 2. Start Frontend
    print(f"\n[Frontend] Starting from {frontend_dir}...")
    npm_exec = "npm.cmd" if os.name == "nt" else "npm"
    
    frontend_process = subprocess.Popen(
        [npm_exec, "run", "dev"],
        cwd=frontend_dir,
        shell=False
    )

    print("\n--------------------------------------------------")
    print(" App is running!")
    print(" Backend: http://localhost:8000")
    print(" Frontend: http://localhost:3000")
    print(" Press Ctrl+C to stop all services.")
    print("--------------------------------------------------\n")

    try:
        # Loop to keep the script alive and monitor subprocesses
        while True:
            time.sleep(1)
            
            # Check if any process has exited unexpectedly
            if backend_process.poll() is not None:
                print("\n[Error] Backend process stopped unexpectedly!")
                break
            
            if frontend_process.poll() is not None:
                print("\n[Error] Frontend process stopped unexpectedly!")
                break

    except KeyboardInterrupt:
        print("\n\nStopping services...")
    finally:
        # Terminate processes on exit
        if backend_process.poll() is None:
            print("Terminating Backend...")
            backend_process.terminate()
        
        if frontend_process.poll() is None:
            print("Terminating Frontend...")
            frontend_process.terminate()
            
        # Wait a bit for them to close gracefully
        try:
            backend_process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            backend_process.kill()
            
        try:
            frontend_process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            frontend_process.kill()
            
        print("All services stopped.")

if __name__ == "__main__":
    main()
