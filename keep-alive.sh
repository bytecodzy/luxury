#!/bin/bash
while true; do
  cd /home/z/my-project
  # Kill any leftover processes on port 3000
  fuser -k 3000/tcp 2>/dev/null
  sleep 1
  # Start server
  bun run dev >> /home/z/my-project/dev.log 2>&1 &
  SERVER_PID=$!
  echo "[$(date)] Started server PID=$SERVER_PID" >> /home/z/my-project/daemon.log
  # Wait up to 15s for server to be ready
  for i in $(seq 1 30); do
    if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
      echo "[$(date)] Server ready" >> /home/z/my-project/daemon.log
      break
    fi
    sleep 0.5
  done
  # Monitor server
  while true; do
    if ! kill -0 $SERVER_PID 2>/dev/null; then
      echo "[$(date)] Server PID $SERVER_PID died" >> /home/z/my-project/daemon.log
      break
    fi
    sleep 2
  done
  sleep 1
done
