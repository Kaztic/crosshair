module.exports = {
  apps: [{
    name: "crosshair-backend",
    script: "uvicorn",
    args: "app.main:app --host 0.0.0.0 --port 8000",
    cwd: "./",
    interpreter: "python3",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
    }
  }]
} 