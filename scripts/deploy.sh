#!/bin/bash
set -e

echo "🚀 Food Delivery Microservices - Deploy"
echo "======================================"

COMPOSE_FILE=${1:-docker-compose.prod.yml}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start
echo "📦 Building services..."
docker compose -f "$COMPOSE_FILE" build

echo "🔄 Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check status
echo "📊 Services status:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "✅ Deploy complete!"
echo ""
echo "🌐 Services:"
echo "  API Gateway:    http://localhost:3000"
echo "  Order Service:  http://localhost:3001"
echo "  Kitchen Service: http://localhost:3002"
echo "  Payment Service: http://localhost:3003"
echo ""
echo "🔧 Infrastructure:"
echo "  RabbitMQ:       http://localhost:15672 (guest/guest)"
echo ""
echo "📝 Logs: docker compose -f $COMPOSE_FILE logs -f [service-name]"
echo "🛑 Stop: docker compose -f $COMPOSE_FILE down"
