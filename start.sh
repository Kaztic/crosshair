#!/bin/bash

# Start Crosshair application

# Check if conda is available
if ! command -v conda &> /dev/null; then
    echo "Conda is not installed or not in PATH. Please install conda and try again."
    exit 1
fi

# Check if conda environment exists, if not create it
if ! conda env list | grep -q "crosshair"; then
    echo "Creating conda environment 'crosshair'..."
    conda create -n crosshair python=3.10 -y
fi

# Activate the conda environment
echo "Activating conda environment..."
eval "$(conda shell.bash hook)"
conda activate crosshair || { echo "Failed to activate conda environment."; exit 1; }

# Install backend dependencies from requirements.txt
echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt

# Check if .env file exists, if not create a template
if [ ! -f ".env" ]; then
    echo "Creating template .env file..."
    cat > .env << EOL
# Gemini API key (required)
GEMINI_API_KEY=your_gemini_api_key_here

# Gemini model to use (optional, defaults to gemini-1.5-pro)
GEMINI_MODEL=gemini-1.5-pro

# Server configuration (optional)
HOST=0.0.0.0
PORT=8000
EOL
    echo "Please edit the .env file and add your Gemini API key."
    echo "Get your API key from https://ai.google.dev/"
    exit 1
fi

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../frontend
npm install

# Start the backend in the background
echo "Starting backend server..."
cd ../backend
python -m app.main &
BACKEND_PID=$!

# Wait for the backend to start
echo "Waiting for backend to start..."
sleep 3

# Start the frontend
echo "Starting frontend server..."
cd ../frontend
npm run dev

# When the frontend process ends, kill the backend
kill $BACKEND_PID 