#!/bin/bash

# Script to deploy the Crosshair backend to EC2

echo "Deploying Crosshair Backend to EC2 instance at 13.51.55.96..."

# SSH to the EC2 instance and set up the backend
ssh -i doc-rs-1.pem ec2-user@13.51.55.96 << 'EOF'
  # Navigate to the project directory
  cd ~/projects/crosshair

  # Pull the latest changes
  git pull

  # Check if Miniconda is installed, if not install it
  if ! command -v conda &> /dev/null; then
    echo "Installing Miniconda..."
    wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda.sh
    bash ~/miniconda.sh -b -p $HOME/miniconda
    rm ~/miniconda.sh
    
    # Add conda to path
    echo 'export PATH="$HOME/miniconda/bin:$PATH"' >> ~/.bashrc
    source ~/.bashrc
    
    # Initialize conda for bash
    ~/miniconda/bin/conda init bash
    source ~/.bashrc
  fi
  
  # Ensure conda command is available
  export PATH="$HOME/miniconda/bin:$PATH"
  
  # Create/update conda environment
  cd backend
  
  if ! conda env list | grep -q "crosshair"; then
    echo "Creating new conda environment: crosshair"
    conda create -y -n crosshair python=3.9
  else
    echo "Using existing conda environment: crosshair"
  fi
  
  # Activate conda environment
  source ~/miniconda/bin/activate crosshair
  
  # Install Python dependencies
  pip install -r requirements.txt
  
  # Make sure the environment is properly activated
  which python
  python -c "import fastapi; print(f'FastAPI version: {fastapi.__version__}')"

  # Create or update .env file
  cat > .env << 'ENVFILE'
# Backend server configuration
HOST=0.0.0.0
PORT=8000

# Add any additional environment variables here
# Example: API keys, database credentials, etc.
ENVFILE

  # Get conda env path
  CONDA_ENV_PATH=$(conda info --envs | grep crosshair | awk '{print $NF}')
  PYTHON_BIN="$CONDA_ENV_PATH/bin/python"
  
  echo "Using Python at: $PYTHON_BIN"

  # Create updated ecosystem.config.js with conda environment
  cat > ecosystem.config.js << ECOSYSTEMFILE
module.exports = {
  apps: [{
    name: "crosshair-backend",
    script: "$CONDA_ENV_PATH/bin/uvicorn",
    args: "app.main:app --host 0.0.0.0 --port 8000",
    cwd: "./",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PATH: process.env.PATH
    }
  }]
}
ECOSYSTEMFILE

  # Install PM2 if not already installed
  if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found, installing..."
    sudo yum update -y
    curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -
    sudo yum install -y nodejs
    sudo npm install pm2 -g
  else
    echo "PM2 is already installed"
  fi

  # Check logs from previous runs if they exist
  if pm2 list | grep crosshair-backend > /dev/null; then
    echo "Previous logs:"
    pm2 logs crosshair-backend --lines 10 || true
    pm2 delete crosshair-backend 2>/dev/null || true
  fi

  # Start or restart the application with PM2
  pm2 start ecosystem.config.js
  
  # Check if application started successfully
  sleep 5
  pm2 status
  
  if pm2 show crosshair-backend | grep -q "status.*online"; then
    echo "Backend started successfully!"
    
    # Open port 8000 in the firewall if needed
    if ! sudo iptables -L | grep -q "port 8000"; then
      echo "Opening port 8000 in the firewall..."
      sudo iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
      sudo service iptables save
    fi
    
    # Test the API
    echo "Testing API access..."
    curl http://localhost:8000 || echo "Could not access API locally"
    curl http://13.51.55.96:8000 || echo "Could not access API via public IP"
  else
    echo "Error starting backend. Checking logs:"
    pm2 logs crosshair-backend --lines 20
  fi

  # Save PM2 configuration so it starts on reboot
  pm2 save
  
  # Setup PM2 to start on boot
  sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
  
  echo "Deployment complete!"
EOF

echo "Backend deployment script executed!"

echo "Remember to update EC2 security group:"
echo "EC2 > Security Groups > [Your SG] > Edit inbound rules > Add TCP:8000 from 0.0.0.0/0" 