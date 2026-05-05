#!/bin/bash
echo "📊 Services Status"
echo "=================="
docker compose -f docker-compose.prod.yml ps
echo ""
echo "🔍 Health Checks:"
echo "API Gateway:    $(curl -s http://localhost:3000/health && echo '✅' || echo '❌')"
echo "Order Service:  $(curl -s http://localhost:3001/health && echo '✅' || echo '❌')"
echo "Kitchen Service: $(curl -s http://localhost:3002/health && echo '✅' || echo '❌')"
echo "Payment Service: $(curl -s http://localhost:3003/health && echo '✅' || echo '❌')"
