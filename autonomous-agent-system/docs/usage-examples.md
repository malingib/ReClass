# Autonomous Agent System - Usage Examples

Complete examples for using the Autonomous Agent System.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Creating Goals](#creating-goals)
3. [Creating Tasks](#creating-tasks)
4. [Running Build Loops](#running-build-loops)
5. [Generating Reports](#generating-reports)
6. [Working with Agents](#working-with-agents)
7. [Real-World Examples](#real-world-examples)

---

## Basic Setup

### Initialize the System

```typescript
import { Agent, routeAgentRequest, callable } from 'agents';

type ProjectState = {
  projectPhase: 'planning' | 'design' | 'implementation' | 'testing' | 'optimization' | 'deployment' | 'production';
  activeTasks: Task[];
  completedTasks: string[];
  projectGoals: Goal[];
  performanceMetrics: PerformanceMetrics;
};

export class MyAgent extends Agent<ProjectState> {
  initialState = {
    projectPhase: 'planning',
    activeTasks: [],
    completedTasks: [],
    projectGoals: [],
    performanceMetrics: {
      buildTime: 0,
      testCoverage: 0,
      codeQualityScore: 100,
      deploymentSuccessRate: 0,
      averageResponseTime: 0
    }
  };

  @callable()
  async initialize(): Promise<string> {
    return 'Agent initialized successfully';
  }
}
```

### Deploy the Agent

```typescript
import { routeAgentRequest } from 'agents';

const agent = new MyAgent();

export default {
  fetch: (req: Request) => routeAgentRequest(req, process.env)
};
```

---

## Creating Goals

### Create a Project Goal

```typescript
const agent = useAgent({
  agent: 'AutonomousOrchestrator',
  name: 'my-project'
});

const result = await agent.setState({
  type: 'create_project_goal',
  goal: {
    title: 'Build User Authentication System',
    description: 'Implement JWT-based authentication with refresh tokens, OAuth 2.0, and role-based access control',
    priority: 'critical'
  }
});

console.log('Goal created:', result.goalId);
```

### Create Multiple Goals

```typescript
const goals = [
  { title: 'Implement Authentication', description: 'JWT + OAuth 2.0', priority: 'critical' },
  { title: 'Build API Infrastructure', description: 'REST API endpoints', priority: 'high' },
  { title: 'Set Up Database', description: 'PostgreSQL schema', priority: 'high' }
];

for (const goal of goals) {
  const result = await agent.setState({
    type: 'create_project_goal',
    goal
  });
  console.log(`Created ${goal.title} with ID: ${result.goalId}`);
}
```

### Create Goals with Milestones

```typescript
const result = await agent.setState({
  type: 'create_project_goal',
  goal: {
    title: 'Complete API Development',
    description: 'Build all REST API endpoints with proper error handling and documentation',
    priority: 'high',
    milestones: [
      'Create user endpoints',
      'Implement authentication',
      'Add validation',
      'Write documentation'
    ]
  }
});
```

---

## Creating Tasks

### Create Simple Tasks

```typescript
const result = await agent.setState({
  type: 'create_task',
  task: {
    description: 'Implement user registration endpoint',
    role: 'backend',
    priority: 'high'
  }
});

console.log('Task created:', result.taskId);
```

### Create Tasks with Dependencies

```typescript
// Create dependencies first
const dep1 = await agent.setState({
  type: 'create_task',
  task: {
    description: 'Design database schema',
    role: 'database',
    priority: 'high'
  }
});

const dep2 = await agent.setState({
  type: 'create_task',
  task: {
    description: 'Create base API structure',
    role: 'backend',
    priority: 'high',
    dependencies: [dep1.taskId]
  }
});
```

### Create Tasks for Specific Agents

```typescript
// Designer tasks
const designTask = await agent.setState({
  type: 'create_task',
  task: {
    description: 'Design authentication flow architecture',
    role: 'designer',
    priority: 'high'
  }
});

// Developer tasks
const devTask = await agent.setState({
  type: 'create_task',
  task: {
    description: 'Implement authentication logic',
    role: 'developer',
    priority: 'high'
  }
});

// Performance tasks
const perfTask = await agent.setState({
  type: 'create_task',
  task: {
    description: 'Optimize authentication queries',
    role: 'performance',
    priority: 'medium'
  }
});
```

---

## Running Build Loops

### Simple Build Loop

```typescript
const result = await agent.setState({
  type: 'run_full_build_loop',
  maxIterations: 100
});

console.log('Iterations completed:', result.iterations);
console.log('Summary:', result.summary);
```

### With Detailed Reporting

```typescript
const result = await agent.setState({
  type: 'run_full_build_loop',
  maxIterations: 50
});

console.log('Build completed in:', result.iterations, 'iterations');
console.log('Final state:', result.finalState);
console.log('Detailed report:', result.detailedReport);
```

### With Phase Tracking

```typescript
const result = await agent.setState({
  type: 'run_full_build_loop',
  maxIterations: 100
});

console.log('Build completed');
console.log('Phase progression:', result.finalState.projectHistory);
```

---

## Generating Reports

### Basic Project Report

```typescript
const report = await agent.setState({
  type: 'generate_report'
});

console.log('Project Summary:', report.summary);
console.log('Progress:', report.metrics.completionRate + '%');
console.log('Active Tasks:', report.metrics.activeTasks);
```

### Comprehensive Report

```typescript
const report = await agent.setState({
  type: 'generate_comprehensive_report'
});

console.log('Build Details:');
console.log('- Iterations:', report.iterations);
console.log('- Final State:', JSON.stringify(report.finalState, null, 2));
console.log('- Summary:', report.summary);
console.log('- Detailed Report:', report.detailedReport);
```

### Architecture Report

```typescript
const architecture = await agent.setState({
  type: 'generate_architecture_report'
});

console.log('Architecture Design:');
console.log(architecture);
```

### Performance Report

```typescript
const performance = await agent.setState({
  type: 'generate_performance_report'
});

console.log('Performance Metrics:');
console.log('- Build Time:', performance.buildTime + 's');
console.log('- Bundle Size:', performance.bundleSize + 'bytes');
console.log('- Test Coverage:', performance.testCoverage + '%');
```

### QA Report

```typescript
const qa = await agent.setState({
  type: 'generate_qa_report'
});

console.log('Quality Report:');
console.log('- Total Tests:', qa.totalTests);
console.log('- Passed:', qa.passedTests);
console.log('- Failed:', qa.failedTests);
console.log('- Coverage:', qa.coverage + '%');

if (qa.bugs.length > 0) {
  console.log('\nIssues Found:');
  qa.bugs.forEach(bug => {
    console.log(`- [${bug.severity}] ${bug.description}`);
  });
}
```

---

## Working with Agents

### Proxy Tasks to Specific Agents

```typescript
// Design task
const designResult = await agent.setState({
  type: 'proxy_task_to_designer',
  task: {
    description: 'Design microservices architecture',
    parameters: {
      techStack: ['Next.js', 'Node.js', 'PostgreSQL'],
      scale: 'large'
    }
  }
});

console.log('Design result:', designResult);

// Development task
const devResult = await agent.setState({
  type: 'proxy_task_to_developer',
  task: {
    description: 'Implement microservices implementation',
    parameters: {}
  }
});

console.log('Development result:', devResult);

// Performance optimization
const perfResult = await agent.setState({
  type: 'proxy_task_to_performance',
  task: {
    description: 'Optimize database queries',
    parameters: {}
  }
});

console.log('Performance result:', perfResult);
```

### Get Agent Status

```typescript
const status = await agent.setState({
  type: 'get_project_status'
});

console.log('Current Phase:', status.projectPhase);
console.log('Active Tasks:', status.activeTasks.length);
console.log('Completed Tasks:', status.completedTasks.length);
console.log('Project Goals:', Object.keys(status.projectGoals).length);
```

### Update Task Status

```typescript
const result = await agent.setState({
  type: 'update_task_status',
  taskId: 'task-1234567890',
  status: 'in_progress'
});

console.log('Task status updated:', result.success);
```

### Restart Failed Tasks

```typescript
const result = await agent.setState({
  type: 'restart_task',
  taskId: 'task-1234567890'
});

console.log('Task restarted:', result.success);
```

### Clean Up Completed Tasks

```typescript
const result = await agent.setState({
  type: 'cleanup_completed_tasks',
  keepLastN: 100
});

console.log('Cleaned tasks:', result.cleaned);
```

---

## Real-World Examples

### Example 1: Building a Full API

```typescript
async function buildAPI() {
  const agent = useAgent({ agent: 'AutonomousOrchestrator', name: 'api-builder' });

  // Define goals
  const goals = [
    { title: 'Design API Architecture', description: 'Define endpoints, authentication, and data models', priority: 'critical' },
    { title: 'Create Database Schema', description: 'Design and implement PostgreSQL schema', priority: 'high' },
    { title: 'Build Authentication', description: 'Implement JWT authentication', priority: 'critical' },
    { title: 'Create API Endpoints', description: 'Implement REST API endpoints', priority: 'high' },
    { title: 'Add Testing', description: 'Write comprehensive tests', priority: 'medium' },
    { title: 'Optimize Performance', description: 'Optimize queries and caching', priority: 'medium' }
  ];

  // Create all goals
  for (const goal of goals) {
    await agent.setState({ type: 'create_project_goal', goal });
  }

  // Create tasks
  const tasks = [
    { description: 'Design API architecture', role: 'designer', priority: 'high' },
    { description: 'Design database schema', role: 'database', priority: 'high' },
    { description: 'Implement authentication', role: 'backend', priority: 'critical' },
    { description: 'Create user endpoints', role: 'backend', priority: 'high' },
    { description: 'Create product endpoints', role: 'backend', priority: 'high' },
    { description: 'Write unit tests', role: 'qa', priority: 'medium' },
    { description: 'Run security tests', role: 'qa', priority: 'high' }
  ];

  for (const task of tasks) {
    await agent.setState({ type: 'create_task', task });
  }

  // Run build loop
  const result = await agent.setState({
    type: 'run_full_build_loop',
    maxIterations: 100
  });

  console.log('API Built Successfully!');
  console.log('Iterations:', result.iterations);
  console.log('Final Status:', result.summary);
}
```

### Example 2: Performance Optimization

```typescript
async function optimizePerformance() {
  const agent = useAgent({ agent: 'AutonomousOrchestrator', name: 'optimizer' });

  // Create optimization tasks
  const tasks = [
    { description: 'Analyze build performance', role: 'performance', priority: 'high' },
    { description: 'Optimize database queries', role: 'database', priority: 'high' },
    { description: 'Optimize API responses', role: 'performance', priority: 'high' },
    { description: 'Optimize frontend bundle', role: 'developer', priority: 'medium' },
    { description: 'Implement caching strategy', role: 'database', priority: 'high' },
    { description: 'Run performance tests', role: 'qa', priority: 'high' }
  ];

  for (const task of tasks) {
    await agent.setState({ type: 'create_task', task });
  }

  // Run build loop focused on optimization
  const result = await agent.setState({
    type: 'run_full_build_loop',
    maxIterations: 50
  });

  // Get performance report
  const performanceReport = await agent.setState({
    type: 'generate_performance_report'
  });

  console.log('Performance Optimization Complete:');
  console.log('- Build Time:', performanceReport.buildTime + 's');
  console.log('- Bundle Size:', performanceReport.bundleSize + 'bytes');
  console.log('- Test Coverage:', performanceReport.testCoverage + '%');
}
```

### Example 3: QA and Testing

```typescript
async function runQA() {
  const agent = useAgent({ agent: 'AutonomousOrchestrator', name: 'qa-system' });

  // Create QA tasks
  const tasks = [
    { description: 'Run unit tests', role: 'qa', priority: 'high' },
    { description: 'Run integration tests', role: 'qa', priority: 'high' },
    { description: 'Run security tests', role: 'qa', priority: 'critical' },
    { description: 'Generate bug reports', role: 'qa', priority: 'high' },
    { description: 'Fix critical bugs', role: 'developer', priority: 'critical' },
    { description: 'Re-run tests after fixes', role: 'qa', priority: 'high' }
  ];

  for (const task of tasks) {
    await agent.setState({ type: 'create_task', task });
  }

  // Run build loop
  const result = await agent.setState({
    type: 'run_full_build_loop',
    maxIterations: 75
  });

  // Get QA report
  const qaReport = await agent.setState({
    type: 'generate_qa_report'
  });

  console.log('QA Results:');
  console.log('- Total Tests:', qaReport.totalTests);
  console.log('- Passed:', qaReport.passedTests);
  console.log('- Failed:', qaReport.failedTests);
  console.log('- Coverage:', qaReport.coverage + '%');

  if (qaReport.bugs.length > 0) {
    console.log('\nBugs Found:');
    qaReport.bugs.forEach(bug => {
      console.log(`- [${bug.severity}] ${bug.description} at ${bug.location}`);
    });
  }
}
```

### Example 4: Complete Project Build

```typescript
async function buildCompleteProject() {
  const agent = useAgent({ agent: 'AutonomousOrchestrator', name: 'project-builder' });

  // Define project phases
  const phases = [
    { name: 'Planning', description: 'Define requirements and goals' },
    { name: 'Design', description: 'Create architecture and designs' },
    { name: 'Implementation', description: 'Build features and endpoints' },
    { name: 'Testing', description: 'Run tests and fix issues' },
    { name: 'Optimization', description: 'Optimize performance' },
    { name: 'Deployment', description: 'Deploy to production' }
  ];

  // Create goals for each phase
  for (const phase of phases) {
    await agent.setState({
      type: 'create_project_goal',
      goal: {
        title: phase.name + ' Phase',
        description: phase.description,
        priority: phase.name === 'Deployment' ? 'critical' : 'high'
      }
    });

    // Transition to phase
    await agent.setState({
      type: 'transition_phase',
      newPhase: phase.name.toLowerCase(),
      reason: `Starting ${phase.name} phase`
    });
  }

  // Create comprehensive task list
  const tasks = [
    { description: 'Define project requirements', role: 'designer', priority: 'high' },
    { description: 'Create user stories', role: 'designer', priority: 'high' },
    { description: 'Design system architecture', role: 'designer', priority: 'high' },
    { description: 'Design database schema', role: 'database', priority: 'high' },
    { description: 'Implement authentication', role: 'backend', priority: 'critical' },
    { description: 'Create API endpoints', role: 'backend', priority: 'high' },
    { description: 'Implement frontend components', role: 'developer', priority: 'high' },
    { description: 'Write unit tests', role: 'qa', priority: 'high' },
    { description: 'Run security tests', role: 'qa', priority: 'critical' },
    { description: 'Optimize queries', role: 'performance', priority: 'high' },
    { description: 'Generate documentation', role: 'developer', priority: 'medium' },
    { description: 'Prepare deployment', role: 'backend', priority: 'high' }
  ];

  for (const task of tasks) {
    await agent.setState({ type: 'create_task', task });
  }

  // Run complete build loop
  const result = await agent.setState({
    type: 'run_full_build_loop',
    maxIterations: 150
  });

  // Get final report
  const finalReport = await agent.setState({
    type: 'generate_comprehensive_report'
  });

  console.log('=== Project Build Complete ===');
  console.log('Iterations:', result.iterations);
  console.log('Final Phase:', result.finalState.projectPhase);
  console.log('Summary:', result.summary);
  console.log('\n=== Detailed Report ===');
  console.log(finalReport.detailedReport);
}
```

---

## Best Practices

1. **Batch Operations**: Process multiple tasks together for better efficiency
2. **Error Handling**: Always handle errors and implement retry logic
3. **Progress Tracking**: Monitor progress regularly
4. **Reporting**: Generate reports after major milestones
5. **Testing**: Always test before deployment
6. **Monitoring**: Monitor agent performance and health
7. **Backup**: Regular backups of project state

---

## Support

For more examples and detailed API documentation, refer to:
- [API Documentation](docs/api.md)
- [Architecture Documentation](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)
