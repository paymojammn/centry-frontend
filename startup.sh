#!/bin/sh

# Set PORT if not provided
export PORT=${PORT:-8080}

echo "Starting Next.js on port $PORT"

# Change to app directory
cd /home/site/wwwroot

# Start Next.js in production mode
npx next start -p $PORT
