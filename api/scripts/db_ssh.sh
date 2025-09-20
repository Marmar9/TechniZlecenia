#!/bin/bash

SSH_ADDR = "root@206.189.52.131"

ssh -L 5432:localhost:5432 $SSH_ADDR

if [ $? -eq 0 ]; then
    echo "SSH tunnel to Postgres started -> localhost:5432"
else
    echo "Failed to start SSH tunnel"
fi