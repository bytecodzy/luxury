#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/.bin/next dev -p 3000
  echo "[$(date)] Next.js crashed, restarting in 3s..." >> /home/z/my-project/restart.log
  sleep 3
done
