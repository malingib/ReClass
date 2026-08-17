# Autonomous Agent System - API Reference

Complete API documentation for the Autonomous Agent System.

## Base URL

```
http://localhost:8787/agents/autonomous-orchestrator/{instance-name}
```

## Authentication

The system uses JWT authentication. Include the JWT token in the `Authorization` header:

```
Authorization: Bearer {your-jwt-token}
```

## Rate Limiting

- **Rate**: 100 requests per minute per IP
- **Window**: 1 minute rolling window
- **Response Headers**:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Reset timestamp

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Authentication failed
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Request validation failed
- `INTERNAL_ERROR`: Internal server error

---

## Agent Methods

### 1. Project Management

#### setProjectGoal

Create a new project goal.

**Request:**
```json
{
  "type": "create_project_goal",
  "goal": {
    "title": "Complete API Development",
    "description": "Build all REST API endpoints",
    "priority": "high"
  }
}
```

**Response:**
```json
{
  "success": true,
  "goalId": "goal-1234567890"
}
```

#### updateProjectGoal

Update an existing project goal.

**Request:**
```json
{
  "type": "update_project_goal",
  "goalId": "goal-1234567890",
  "updates": {
    "progress": 75,
    "priority": "critical"
  }
}
```

**Response:**
```json
{
  "success": true
}
```

#### getProjectStatus

Get the current project status.

**Request:**
```json
{
  "type": "get_project_status"
}
```

**Response:**
```json
{
  "projectPhase": "implementation",
  "activeTasks": [...],
  "completedTasks": [...],
  "projectGoals": [...],
  "performanceMetrics": {...}
}
```

---

### 2. Task Management

#### createTask

Create a new task for a specific agent.

**Request:**
```json
{
  "type": "create_task",
  "task": {
    "description": "Implement user authentication",
    "role": "backend",
    "priority": "high",
    "dependencies": ["task-1", "task-2"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "task-1234567890"
}
```

#### processTaskQueue

Process all pending tasks in the queue.

**Request:**
```json
{
  "type": "process_task_queue"
}
```

**Response:**
```json
{
  "success": true,
  "processed": 3
}
```

#### restartTask

Restart a failed task.

**Request:**
```json
{
  "type": "restart_task",
  "taskId": "task-1234567890"
}
```

**Response:**
```json
{
  "success": true
}
```

#### cleanupCompletedTasks

Clean up completed tasks.

**Request:**
```json
{
  "type": "cleanup_completed_tasks",
  "keepLastN": 100
}
```

**Response:**
```json
{
  "success": true,
  "cleaned": 50
}
```

---

### 3. Phase Management

#### transitionPhase

Transition to a new project phase.

**Request:**
```json
{
  "type": "transition_phase",
  "newPhase": "implementation",
  "reason": "Design phase completed successfully"
}
```

**Response:**
```json
{
  "fromPhase": "design",
  "toPhase": "implementation",
  "reason": "Design phase completed successfully",
  "nextSteps": [
    "Implement core features",
    "Write unit tests",
    "Set up development environment"
  ]
}
```

#### getRecommendedNextSteps

Get recommended next steps for current phase.

**Request:**
```json
{
  "type": "get_recommended_next_steps"
}
```

**Response:**
```json
{
  "steps": [
    "Implement core features",
    "Write unit tests",
    "Set up development environment"
  ]
}
```

---

### 4. Reports and Analysis

#### generateReport

Generate comprehensive project report.

**Request:**
```json
{
  "type": "generate_report"
}
```

**Response:**
```json
{
  "summary": "Project is at 37% completion. Currently in implementation phase.",
  "metrics": {
    "buildTime": 45,
    "testCoverage": 82,
    "codeQualityScore": 92,
    "deploymentSuccessRate": 99.5,
    "averageResponseTime": 120,
    "completionRate": 37,
    "activeTasks": 8,
    "failedTasks": 2,
    "completedTasks": 15
  },
  "recommendations": [
    "Address critical bugs found in QA before deployment",
    "Review and resolve failed tasks",
    "Prioritize remaining active goals"
  ],
  "nextActions": [
    "Complete API implementation",
    "Run performance optimization",
    "Prepare for deployment"
  ]
}
```

#### generateArchitectureReport

Generate architecture design report.

**Request:**
```json
{
  "type": "generate_architecture_report"
}
```

**Response:**
```json
{
  "report": "...",
  "systemArchitecture": "Microservices with event-driven communication",
  "techStack": {
    "frontend": ["Next.js 14", "TypeScript", "Tailwind CSS"],
    "backend": ["Node.js", "Express", "GraphQL"],
    "database": ["PostgreSQL", "Redis", "Prisma"]
  }
}
```

#### generateComprehensiveReport

Generate detailed project analysis.

**Request:**
```json
{
  "type": "generate_comprehensive_report"
}
```

**Response:**
```json
{
  "iterations": 50,
  "finalState": {...},
  "summary": "Build loop completed successfully",
  "detailedReport": "..."
}
```

#### exportProjectState

Export the current project state.

**Request:**
```json
{
  "type": "export_project_state"
}
```

**Response:**
```json
{
  "goals": [...],
  "tasks": [...],
  "phase": "implementation",
  "metrics": {...}
}
```

---

### 5. Build Automation

#### runFullBuildLoop

Execute the complete build loop.

**Request:**
```json
{
  "type": "run_full_build_loop",
  "maxIterations": 100
}
```

**Response:**
```json
{
  "iterations": 50,
  "finalState": {...},
  "summary": "Build loop completed successfully",
  "detailedReport": "..."
}
```

---

### 6. Performance Optimization

#### optimizeBuildPerformance

Optimize build performance.

**Request:**
```json
{
  "type": "optimize_build_performance"
}
```

**Response:**
```json
{
  "optimization": "...",
  "results": {
    "buildTime": 25,
    "bundleSize": 850000,
    "improvement": "44%"
  }
}
```

#### optimizeDatabasePerformance

Optimize database performance.

**Request:**
```json
{
  "type": "optimize_database_performance"
}
```

**Response:**
```json
{
  "optimization": "...",
  "results": {
    "queryTime": 45,
    "cacheHitRate": 95,
    "improvement": "82%"
  }
}
```

#### optimizeAPILatency

Optimize API performance.

**Request:**
```json
{
  "type": "optimize_api_latency"
}
```

**Response:**
```json
{
  "optimization": "...",
  "results": {
    "avgResponseTime": 120,
    "p95ResponseTime": 250,
    "improvement": "52%"
  }
}
```

---

### 7. Quality Assurance

#### createTestSuite

Create a new test suite.

**Request:**
```json
{
  "type": "create_test_suite",
  "testSuite": {
    "name": "API Tests",
    "type": "integration",
    "files": ["src/api/users.test.ts"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "suiteId": "suite-1234567890"
}
```

#### runUnitTests

Run unit tests.

**Request:**
```json
{
  "type": "run_unit_tests",
  "files": ["src/utils/format.test.ts"]
}
```

**Response:**
```json
{
  "testResults": "...",
  "coverage": 85,
  "passed": 43,
  "failed": 2
}
```

#### runE2ETests

Run end-to-end tests.

**Request:**
```json
{
  "type": "run_e2e_tests"
}
```

**Response:**
```json
{
  "testResults": "...",
  "passed": 10,
  "failed": 0,
  "executionTime": 8.2
}
```

#### runSecurityTests

Run security tests.

**Request:**
```json
{
  "type": "run_security_tests"
}
```

**Response:**
```json
{
  "securityScore": 88,
  "findings": [
    {
      "severity": "high",
      "location": "src/api/users.ts:45",
      "description": "SQL injection vulnerability",
      "recommendation": "Use parameterized queries"
    }
  ]
}
```

#### generateQualityReport

Generate QA report.

**Request:**
```json
{
  "type": "generate_quality_report"
}
```

**Response:**
```json
{
  "totalTests": 100,
  "passedTests": 93,
  "failedTests": 5,
  "coverage": 84,
  "codeQualityScore": 92,
  "securityScore": 88,
  "bugs": [...]
}
```

---

### 8. Goal Tracking

#### createGoal

Create a new goal.

**Request:**
```json
{
  "type": "create_goal",
  "goal": {
    "title": "Complete API Development",
    "description": "Build all REST API endpoints",
    "priority": "high"
  }
}
```

**Response:**
```json
{
  "success": true,
  "goalId": "goal-1234567890"
}
```

#### updateGoalProgress

Update goal progress.

**Request:**
```json
{
  "type": "update_goal_progress",
  "goalId": "goal-1234567890",
  "progress": 75,
  "metrics": {
    "completedTasks": 25,
    "totalTasks": 30
  }
}
```

**Response:**
```json
{
  "success": true
}
```

#### generateHealthScore

Generate project health score.

**Request:**
```json
{
  "type": "generate_health_score"
}
```

**Response:**
```json
{
  "overall": 85,
  "byCategory": {
    "planning": 90,
    "design": 88,
    "development": 82,
    "testing": 78,
    "deployment": 75
  },
  "riskFactors": [...],
  "recommendations": [...]
}
```

#### generateGoalReport

Generate goal report.

**Request:**
```json
{
  "type": "generate_goal_report"
}
```

**Response:**
```json
{
  "totalGoals": 8,
  "completedGoals": 3,
  "activeGoals": 4,
  "abandonedGoals": 1,
  "overallProgress": 37,
  "upcomingDeadlines": [...]
}
```

---

### 9. Proxy Methods

#### proxyTaskToDesigner

Proxy a task to the designer agent.

**Request:**
```json
{
  "type": "proxy_task_to_designer",
  "task": {
    "description": "Design user authentication flow",
    "parameters": {}
  }
}
```

**Response:**
```json
{
  "result": "...",
  "completedAt": 1234567890
}
```

#### proxyTaskToDeveloper

Proxy a task to the developer agent.

**Request:**
```json
{
  "type": "proxy_task_to_developer",
  "task": {
    "description": "Implement user authentication",
    "parameters": {}
  }
}
```

**Response:**
```json
{
  "result": "...",
  "completedAt": 1234567890
}
```

#### proxyTaskToBackend

Proxy a task to the backend agent.

**Request:**
```json
{
  "type": "proxy_task_to_backend",
  "task": {
    "description": "Create user API endpoints",
    "parameters": {}
  }
}
```

**Response:**
```json
{
  "result": "...",
  "completedAt": 1234567890
}
```

#### proxyTaskToDatabase

Proxy a task to the database agent.

**Request:**
```json
{
  "type": "proxy_task_to_database",
  "task": {
    "description": "Design user table schema",
    "parameters": {}
  }
}
```

**Response:**
```json
{
  "result": "...",
  "completedAt": 1234567890
}
```

#### proxyTaskToPerformance

Proxy a task to the performance agent.

**Request:**
```json
{
  "type": "proxy_task_to_performance",
  "task": {
    "description": "Optimize query performance",
    "parameters": {}
  }
}
```

**Response:**
```json
{
  "result": "...",
  "completedAt": 1234567890
}
```

#### proxyTaskToQA

Proxy a task to the QA agent.

**Request:**
```json
{
  "type": "proxy_task_to_qa",
  "task": {
    "description": "Run security tests",
    "parameters": {}
  }
}
```

**Response:**
```json
{
  "result": "...",
  "completedAt": 1234567890
}
```

---

## WebSocket Events

### State Updates

**Event: State Update**
```json
{
  "type": "state_update",
  "state": {...}
}
```

**Event: Goal Created**
```json
{
  "type": "goal_created",
  "goal": {...}
}
```

**Event: Task Created**
```json
{
  "type": "task_created",
  "task": {...}
}
```

**Event: Task Completed**
```json
{
  "type": "task_completed",
  "task": {...}
}
```

**Event: Phase Transition**
```json
{
  "type": "phase_transition",
  "fromPhase": "design",
  "toPhase": "implementation",
  "reason": "...",
  "nextSteps": [...]
}
```

### Agent Events

**Event: Agent Executing**
```json
{
  "type": "agent_executing",
  "agent": "designer",
  "task": "Design user authentication"
}
```

**Event: Agent Completed**
```json
{
  "type": "agent_completed",
  "agent": "designer",
  "result": "..."
}
```

---

## Client SDK

### React Hook

```tsx
import { useAgent } from "agents/react";

function MyComponent() {
  const [state, setState] = useState({});
  
  const agent = useAgent({
    agent: "AutonomousOrchestrator",
    name: "my-instance",
    onStateUpdate: (newState) => setState(newState),
    onIdentity: (name, type) => console.log(`Connected as ${name}`)
  });

  const handleCreateGoal = async () => {
    const result = await agent.setState({
      type: "create_project_goal",
      goal: { title: "API Development", priority: "high" }
    });
    console.log(result);
  };

  return (
    <button onClick={handleCreateGoal}>
      Create Goal
    </button>
  );
}
```

---

## Best Practices

1. **Batch Operations**: Use batch operations for multiple similar requests
2. **Error Handling**: Always handle errors and implement retry logic
3. **Rate Limiting**: Respect rate limits and implement backoff
4. **State Management**: Keep state updates minimal and efficient
5. **Testing**: Test all agent interactions thoroughly
6. **Monitoring**: Monitor agent performance and optimize as needed

---

## Support

For API support, please refer to the main documentation or open an issue.
