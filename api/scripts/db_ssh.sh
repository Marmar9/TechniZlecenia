#!/bin/bash

ssh -f -N -L 5432:localhost:5432 root@206.189.52.131

if [ $? -eq 0 ]; then
    echo "SSH tunnel to Postgres started -> localhost:5432"
else
    echo "Failed to start SSH tunnel"
fi