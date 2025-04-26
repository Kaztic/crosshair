# Crosshair

A lightweight code assistant tool for game developers. Crosshair allows you to select code, provide a natural language prompt, and receive AI-powered improvements to your code.

## Features

- Monaco Editor for code editing with syntax highlighting
- Select code and provide natural language instructions
- AI-powered code suggestions using Google Gemini models
- Explanations of changes made by the AI
- Easy integration of suggested code changes

## Project Structure

```
crosshair/
├── frontend/            # React + Vite frontend
├── backend/             # FastAPI backend
│   ├── app/             # Python package for the API
│   └── requirements.txt # Python dependencies
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [Conda](https://docs.conda.io/en/latest/miniconda.html) (for managing Python environment)
- [Google AI Studio API Key](https://ai.google.dev/) (for Gemini access)

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd crosshair
```

### 2. Set up the Conda environment

Create and activate a conda environment:
```bash
conda create -n crosshair python=3.10
conda activate crosshair
```

Install the backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure the backend

Create a `.env` file in the `backend` directory:

```bash
# If not already in the backend directory
cd backend
```

Create a file named `.env` with the following content:

```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-pro
HOST=0.0.0.0
PORT=8000
```

You can get a Gemini API key from [Google AI Studio](https://ai.google.dev/).

### 4. Install frontend dependencies

```bash
cd ../frontend
npm install
```

## Running the Application

### 1. Start the backend server

Make sure the conda environment is activated:
```bash
conda activate crosshair
```

```bash
cd backend
python -m app.main
```

The backend will be available at http://localhost:8000

### 2. Start the frontend development server

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will be available at http://localhost:5173

## Usage

1. Enter or paste your code into the editor
2. Select the code you want to improve
3. Enter a prompt describing the desired changes
4. Click "Generate Suggestion"
5. Review the suggested code and explanation
6. Click "Integrate Code" to apply the changes

## Example Prompts

- "Optimize this collision detection function for performance"
- "Add comments explaining how this pathfinding algorithm works"
- "Refactor this character controller to follow SOLID principles"
- "Convert this to use async/await instead of callbacks"

## License

MIT 