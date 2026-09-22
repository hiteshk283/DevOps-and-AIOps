#!/bin/bash
set -e

echo "Starting HealthShield AIOps Multi-Agent Swarm..."

# Start FastAPI headless service in background on port 3011
uvicorn server:app --host 0.0.0.0 --port 3011 &

# Start Streamlit UI on port 8501
streamlit run app.py --server.port 8501 --server.address 0.0.0.0
