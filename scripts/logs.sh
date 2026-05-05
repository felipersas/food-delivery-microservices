#!/bin/bash
SERVICE=${1:-}
COMPOSE_FILE=${2:-docker-compose.prod.yml}

if [ -z "$SERVICE" ]; then
    docker compose -f "$COMPOSE_FILE" logs -f
else
    docker compose -f "$COMPOSE_FILE" logs -f "$SERVICE"
fi
