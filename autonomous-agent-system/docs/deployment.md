# Deployment Guide

Complete guide for deploying the Autonomous Agent System to production.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Cloudflare Workers Deployment](#cloudflare-workers-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Configuration](#configuration)
7. [Monitoring](#monitoring)
8. [Security](#security)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- Node.js 18 or higher
- npm or yarn
- Docker (for Docker deployment)
- Kubernetes CLI (for K8s deployment)
- Cloudflare CLI (`wrangler`)
- Git

### Required Services

- Cloudflare account
- (Optional) Redis for caching
- (Optional) PostgreSQL for database
- (Optional) CDN for static assets

---

## Environment Setup

### 1. Create `.env` File

```env
# API Configuration
AGENT_URL=http://localhost:8787
AGENT_NAME=autonomous-orchestrator

# Project Settings
PROJECT_NAME=autonomous-agent-system
PROJECT_VERSION=1.0.0

# Database
DATABASE_PATH=./database.sqlite

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Performance
MAX_ITERATIONS=100
MAX_CONCURRENT_TASKS=5
TASK_TIMEOUT_MS=300000

# Quality Assurance
TEST_TIMEOUT_MS=5000
MAX_PERFORMANCE_BOTTLENECKS=10

# Deployment
DEPLOYMENT_ENVIRONMENT=production
DEPLOYMENT_REGION=us-east-1
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Tests

```bash
npm test
```

### 4. Build Application

```bash
npm run build
```

---

## Cloudflare Workers Deployment

### 1. Configure Wrangler

Edit `wrangler.jsonc`:

```jsonc
{
  "name": "autonomous-agent-system",
  "main": "src/index.ts",
  "compatibility_flags": ["nodejs_compat"],
  "durable_objects": {
    "bindings": [
      {
        "name": "AutonomousOrchestrator",
        "class_name": "AutonomousOrchestrator"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["AutonomousOrchestrator"]
    }
  ],
  "ai": {
    "binding": "AI"
  },
  "env_variables": {
    "DATABASE_PATH": "/tmp/database.sqlite",
    "LOG_LEVEL": "info",
    "LOG_FORMAT": "json"
  }
}
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

### 3. Deploy to Production

```bash
npx wrangler deploy --env production
```

### 4. Verify Deployment

```bash
npx wrangler tail
```

### 5. Access the Dashboard

```bash
curl https://your-worker-name.workers.dev/agents/autonomous-orchestrator/dashboard
```

---

## Docker Deployment

### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=8787

EXPOSE 8787

CMD ["node", "src/index.ts"]
```

### 2. Build Docker Image

```bash
docker build -t autonomous-agent-system:latest .
```

### 3. Run Container

```bash
docker run -d \
  --name autonomous-agent \
  -p 8787:8787 \
  -e DATABASE_PATH=/data/database.sqlite \
  -v autonomous-agent-db:/data \
  autonomous-agent-system:latest
```

### 4. Run with Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  agent:
    image: autonomous-agent-system:latest
    container_name: autonomous-agent
    ports:
      - "8787:8787"
    environment:
      - DATABASE_PATH=/data/database.sqlite
      - LOG_LEVEL=info
      - NODE_ENV=production
    volumes:
      - autonomous-agent-db:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8787/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  autonomous-agent-db:
```

Run it:

```bash
docker-compose up -d
```

---

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace autonomous-agent
```

### 2. Create ConfigMap

```bash
kubectl create configmap agent-config \
  --from-literal=LOG_LEVEL=info \
  --from-literal=DATABASE_PATH=/data/database.sqlite \
  -n autonomous-agent
```

### 3. Create Persistent Volume

```yaml
# pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: autonomous-agent-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /data/autonomous-agent
```

### 4. Create Persistent Volume Claim

```yaml
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: autonomous-agent-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

### 5. Create Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: autonomous-agent
  namespace: autonomous-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: autonomous-agent
  template:
    metadata:
      labels:
        app: autonomous-agent
    spec:
      containers:
      - name: agent
        image: autonomous-agent-system:latest
        ports:
        - containerPort: 8787
        env:
        - name: DATABASE_PATH
          valueFrom:
            configMapKeyRef:
              name: agent-config
              key: DATABASE_PATH
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: agent-config
              key: LOG_LEVEL
        volumeMounts:
        - name: data
          mountPath: /data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: autonomous-agent-pvc
```

### 6. Create Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: autonomous-agent-service
  namespace: autonomous-agent
spec:
  selector:
    app: autonomous-agent
  ports:
  - protocol: TCP
    port: 8787
    targetPort: 8787
  type: LoadBalancer
```

### 7. Deploy to Kubernetes

```bash
kubectl apply -f pv.yaml -n autonomous-agent
kubectl apply -f pvc.yaml -n autonomous-agent
kubectl apply -f deployment.yaml -n autonomous-agent
kubectl apply -f service.yaml -n autonomous-agent
```

### 8. Access the Service

```bash
kubectl get svc autonomous-agent-service -n autonomous-agent
```

---

## Configuration

### Environment Variables

Configure these variables for optimal performance:

```env
# Database Performance
DATABASE_POOL_SIZE=20
DATABASE_QUERY_TIMEOUT=5000
DATABASE_CACHE_SIZE=100

# API Performance
API_MAX_REQUEST_SIZE=1048576
API_RATE_LIMIT=100
API_RESPONSE_TIMEOUT=30000

# Worker Performance
WORKER_MAX_CONCURRENT_TASKS=5
WORKER_TASK_TIMEOUT=300000
WORKER_MEMORY_LIMIT=512MB

# Monitoring
MONITORING_ENABLED=true
MONITORING_INTERVAL=60000
ALERT_THRESHOLD=80

# Security
SECURITY_ENABLE_RATE_LIMITING=true
SECURITY_ENABLE_CORS=true
SECURITY_ENABLE_SECURITY_HEADERS=true
```

### Database Optimization

For production, use PostgreSQL instead of SQLite:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

Configure connection pooling:

```typescript
// src/database-config.ts
export const poolConfig = {
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

---

## Monitoring

### Health Checks

Add health check endpoint:

```typescript
@callable()
async healthCheck(): Promise<{ status: string; uptime: number }> {
  return {
    status: "healthy",
    uptime: process.uptime()
  };
}
```

### Metrics Collection

Configure monitoring tools:

```typescript
import { PrometheusClient } from 'prom-client';

const client = new PrometheusClient({
  defaultMetrics: {
    enable: true,
    durationBuckets: [0.1, 0.5, 1, 5, 10]
  }
});

// Create custom metrics
const requestDuration = new client.Histogram({
  name: 'agent_request_duration_seconds',
  help: 'Duration of agent requests in seconds',
  labelNames: ['agent', 'operation', 'status']
});
```

### Alerts

Set up alerts for:

- High error rate (>5%)
- High response time (>500ms)
- Service downtime
- Memory usage >80%
- Database connection issues

---

## Security

### 1. Authentication

Implement JWT authentication:

```typescript
import jwt from 'jsonwebtoken';

function authenticate(token: string): User {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as User;
  } catch {
    throw new Error('Invalid token');
  }
}
```

### 2. Authorization

Implement RBAC:

```typescript
type Role = 'admin' | 'developer' | 'viewer';

function authorize(user: User, requiredRole: Role): boolean {
  const rolesHierarchy: Record<Role, number> = {
    admin: 3,
    developer: 2,
    viewer: 1
  };
  return rolesHierarchy[user.role] >= rolesHierarchy[requiredRole];
}
```

### 3. Rate Limiting

Implement rate limiting:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 4. Security Headers

Add security headers:

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

### 5. Input Validation

Validate all inputs:

```typescript
import { z } from 'zod';

const taskSchema = z.object({
  description: z.string().min(10).max(500),
  role: z.enum(['designer', 'developer', 'backend', 'database', 'performance', 'qa']),
  priority: z.enum(['high', 'medium', 'low'])
});

function validateTask(input: unknown) {
  return taskSchema.parse(input);
}
```

---

## Backup and Recovery

### 1. Database Backups

Set up automated backups:

```bash
# Create backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Add to crontab
0 2 * * * /scripts/backup.sh
```

### 2. Backup Strategy

- Daily full backups
- Hourly incremental backups
- 30-day retention
- Off-site backups

### 3. Recovery Process

```bash
# Restore database
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_20240101.sql
```

### 4. Disaster Recovery Plan

- Test recovery procedures monthly
- Keep off-site backups
- Document recovery process
- Test restoration quarterly

---

## Troubleshooting

### Common Issues

#### 1. High Memory Usage

**Problem:** Agent system consuming too much memory.

**Solution:**
```typescript
// Set memory limits
const worker = new Worker('./agent.js', {
  maxMemory: '512MB',
  maxWorkers: 5
});
```

#### 2. Slow Performance

**Problem:** Agent system responding slowly.

**Solution:**
```typescript
// Optimize database queries
const optimizedQuery = `
  SELECT * FROM users
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 100
  OFFSET ${offset}
`;
```

#### 3. Connection Pool Exhaustion

**Problem:** Database connections running out.

**Solution:**
```typescript
// Increase pool size
const pool = createPool({
  min: 10,
  max: 100,
  connectionTimeout: 2000
});
```

#### 4. Task Queue Backlog

**Problem:** Tasks piling up in queue.

**Solution:**
```typescript
// Increase max concurrent tasks
const MAX_CONCURRENT_TASKS = 10;
```

### Logging

Enable detailed logging:

```typescript
const logger = {
  error: (message: string, error: Error) => {
    console.error(`[ERROR] ${message}`, error);
    // Send to monitoring service
  },
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data);
  }
};
```

### Debug Mode

Enable debug mode:

```env
LOG_LEVEL=debug
DEBUG=true
```

### Support

If issues persist:

1. Check logs: `npx wrangler tail`
2. Verify configuration
3. Review system metrics
4. Check for known issues
5. Contact support

---

## Maintenance

### Regular Tasks

- **Daily**: Check logs and alerts
- **Weekly**: Review performance metrics
- **Monthly**: Update dependencies
- **Quarterly**: Full system audit
- **Annually**: Security review

### Updates

```bash
# Update dependencies
npm update

# Rebuild and redeploy
npm run build
npm run deploy
```

---

## Conclusion

Follow this deployment guide to successfully deploy the Autonomous Agent System to production. For questions or issues, refer to the documentation or contact support.
