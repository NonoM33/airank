#!/bin/sh
echo "Running database migrations..."
./node_modules/.bin/prisma db push --skip-generate --accept-data-loss 2>&1 || echo "DB push warning (tables may exist)"
echo "Starting server..."
exec node server.js
