#!/bin/sh
echo "Running database migrations..."
/opt/prisma/node_modules/.bin/prisma db push --schema /app/prisma/schema.prisma --url "$DATABASE_URL" --accept-data-loss 2>&1 || echo "DB push warning (tables may exist)"
echo "Starting server..."
exec node server.js
