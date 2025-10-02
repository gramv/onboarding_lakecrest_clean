import json
print(json.dumps({
    "tabs": [
        {
            "name": "Backend_FastAPI",
            "cwd": "/Users/gouthamvemula/onbfinaldev/backend",
            "command": "source venv/bin/activate && uvicorn app.main_enhanced:app --reload --port 8000"
        }
    ]
})
