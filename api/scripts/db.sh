#!/bin/bash

# If container exists but is stopped -> start it
if [ "$(docker ps -aq -f name=^tz-db$)" ]; then
  echo "Reusing existing container tz-db..."
  docker start tz-db
else
  echo "Creating new container tz-db..."
  docker run -d --name tz-db \
    -e POSTGRES_PASSWORD=dev \
    -e POSTGRES_USER=dev \
    -e POSTGRES_DB=techni-zlecenia \
    -p 5432:5432 postgres:16
fi

echo "DB RUNNING ON: postgres://dev:dev@localhost:5432/techni-zlecenia"