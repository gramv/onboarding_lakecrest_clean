import subprocess
import json

config = {
    "tabs": [
        {
            "name": "Backend_FastAPI",
            "cwd": "/Users/gouthamvemula/onbfinaldev/backend",
            "command": "source venv/bin/activate && uvicorn app.main_enhanced:app --reload --port 8000"
        }
    ]
}

subprocess.run(["python3", "-m", "iterm2_runner"], input=json.dumps(config).encode('utf-8'))
