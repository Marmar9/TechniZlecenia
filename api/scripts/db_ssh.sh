#!/bin/bash

# Kill any existing tunnel
pkill -f "ssh.*5432:localhost:5432"

# Start SSH tunnel to database
ssh -f -N -L 5432:localhost:5432 root@206.189.52.131

if [ $? -eq 0 ]; then
    echo "SSH tunnel to Postgres started -> localhost:5432"
    echo "Database is now accessible at localhost:5432"
    echo "Run 'pkill -f ssh.*5432' to stop the tunnel"
else
    echo "Failed to start SSH tunnel"
    exit 1
fi