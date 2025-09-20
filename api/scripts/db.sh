#!/bin/bash

# If container exists but is stopped -> start it
if [ "$(docker ps -aq -f name=^tz-db$)" ]; then
  echo "Reusing existing container tz-db..."
  docker start tz-db
else
  echo "Creating new container tz-db..."
  docker run -d --name tz-db \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_DB=tz \
    -p 5432:5432 postgres:16
fi

echo "DB RUNNING ON: postgres://postgres:postgres@localhost:5432/tz"