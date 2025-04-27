module.exports = {
    apps: [
      {
        name: "crosshair-backend", // You can change this name
        script: "uvicorn",        // The command to execute
        args: "app.main:app --host 0.0.0.0 --port 8000", // Arguments for uvicorn
        cwd: "/home/ec2-user/projects/crosshair/backend", // Working directory
        interpreter: "python3",  // Specify the Python interpreter (important!)
        instances: 1,          // Number of instances to run (usually 1 for simple apps)
        autorestart: true,      // Restart the app automatically if it crashes
        watch: false,          // Don't watch for file changes (for production)
        max_memory_restart: "1G", // Restart if the app uses too much memory
        env: {
          NODE_ENV: "production", // Set the environment
        },
      },
    ],
  };
  