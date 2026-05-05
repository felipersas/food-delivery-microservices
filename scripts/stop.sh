#!/bin/bash
docker compose -f docker-compose.prod.yml down
echo "✅ All services stopped"
