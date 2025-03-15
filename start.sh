#!/bin/bash

# Activate virtual environment
source .venv/bin/activate

# Start FastAPI server in the background
uvicorn main:app --reload --port 8000 --host 0.0.0.0 &

# Save the FastAPI process ID
FASTAPI_PID=$!

# Navigate to frontend directory
cd fantasy-frontend

# Install dependencies
npm install

# Start frontend development server
npm run dev

# When the script is interrupted (Ctrl+C), kill the FastAPI process
trap "kill $FASTAPI_PID" EXIT 