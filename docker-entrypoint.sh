#!/bin/sh
# Copy initial empty database if none exists (persisted via volume)
if [ ! -f /app/data/airank.db ]; then
  echo "Creating initial database..."
  cp /app/prisma/dev.db /app/data/airank.db
fi
exec node server.js
