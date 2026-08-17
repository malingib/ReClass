import { describe, it, expect } from 'vitest';
import { AutonomousOrchestrator } from '../orchestrator';

describe('Autonomous Agent System', () => {
  describe('Orchestrator Agent', () => {
    it('should initialize with default state', () => {
      const orchestrator = new AutonomousOrchestrator();
      expect(orchestrator.state).toBeDefined();
      expect(orchestrator.state.projectPhase).toBe('planning');
    });

    it('should create project goals', async () => {
      const orchestrator = new AutonomousOrchestrator();
      
      const result = await orchestrator.setState({
        type: 'create_project_goal',
        goal: {
          title: 'Test Goal',
          description: 'Test Description',
          priority: 'high'
        }
      });

      expect(result.success).toBe(true);
      expect(result.goalId).toBeDefined();
    });

    it('should transition phases', async () => {
      const orchestrator = new AutonomousOrchestrator();
      
      const result = await orchestrator.setState({
        type: 'transition_phase',
        newPhase: 'design',
        reason: 'Test transition'
      });

      expect(result.fromPhase).toBe('planning');
      expect(result.toPhase).toBe('design');
      expect(result.reason).toBe('Test transition');
    });

    it('should process task queue', async () => {
      const orchestrator = new AutonomousOrchestrator();
      
      await orchestrator.setState({
        type: 'create_task',
        task: {
          description: 'Test task',
          role: 'designer',
          priority: 'high'
        }
      });

      const result = await orchestrator.setState({
        type: 'process_task_queue'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Designer Agent', () => {
    it('should create component designs', async () => {
      const designer = new DesignerAgent();
      
      const result = await designer.setState({
        type: 'create_component_design',
        component: {
          name: 'UserButton',
          type: 'button',
          props: { variant: 'primary' },
          state: ['isLoading'],
          functions: ['onClick'],
          style: 'primary',
          documentation: 'Test documentation'
        }
      });

      expect(result.success).toBe(true);
      expect(result.componentId).toBeDefined();
    });

    it('should generate architecture', async () => {
      const designer = new DesignerAgent();
      
      const result = await designer.setState({
        type: 'generate_architecture',
        requirements: 'Test requirements'
      });

      expect(result).toContain('Architecture');
      expect(result).toContain('Test requirements');
    });
  });

  describe('Developer Agent', () => {
    it('should create code files', async () => {
      const developer = new DeveloperAgent();
      
      const result = await developer.setState({
        type: 'create_code_file',
        file: {
          path: 'src/components/Button.tsx',
          name: 'Button',
          type: 'component',
          content: 'export function Button() {}'
        }
      });

      expect(result.success).toBe(true);
      expect(result.fileId).toBeDefined();
    });

    it('should implement features', async () => {
      const developer = new DeveloperAgent();
      
      const result = await developer.setState({
        type: 'implement_feature',
        feature: 'Test feature'
      });

      expect(result).toContain('Implementation');
      expect(result).toContain('Test feature');
    });
  });

  describe('Database Agent', () => {
    it('should create table schemas', async () => {
      const database = new DatabaseAgent();
      
      const result = await database.setState({
        type: 'create_table_schema',
        table: {
          name: 'users',
          columns: [{ name: 'id', type: 'integer', nullable: false }],
          indexes: [],
          relationships: [],
          constraints: []
        }
      });

      expect(result.success).toBe(true);
      expect(result.tableId).toBeDefined();
    });

    it('should design schemas', async () => {
      const database = new DatabaseAgent();
      
      const result = await database.setState({
        type: 'design_schema',
        requirements: 'Test requirements'
      });

      expect(result).toContain('Database Schema Design');
    });
  });

  describe('Performance Agent', () => {
    it('should analyze build performance', async () => {
      const performance = new PerformanceAgent();
      
      const result = await performance.setState({
        type: 'analyze_build_performance'
      });

      expect(result.buildTime).toBeDefined();
      expect(result.bundleSize).toBeDefined();
    });

    it('should optimize performance', async () => {
      const performance = new PerformanceAgent();
      
      const result = await performance.setState({
        type: 'optimize_performance'
      });

      expect(result).toContain('Optimization');
    });
  });

  describe('QA Agent', () => {
    it('should create test suites', async () => {
      const qa = new QAAgent();
      
      const result = await qa.setState({
        type: 'create_test_suite',
        testSuite: {
          name: 'Test Suite',
          type: 'unit',
          files: ['test.ts']
        }
      });

      expect(result.success).toBe(true);
      expect(result.suiteId).toBeDefined();
    });

    it('should run tests', async () => {
      const qa = new QAAgent();
      
      const result = await qa.setState({
        type: 'run_unit_tests',
        files: ['test.ts']
      });

      expect(result).toContain('Unit Tests');
    });
  });

  describe('Goal Tracker Agent', () => {
    it('should create goals', async () => {
      const tracker = new GoalTrackerAgent();
      
      const result = await tracker.setState({
        type: 'create_goal',
        goal: {
          title: 'Test Goal',
          description: 'Test Description',
          priority: 'high'
        }
      });

      expect(result.success).toBe(true);
      expect(result.goalId).toBeDefined();
    });

    it('should calculate health score', async () => {
      const tracker = new GoalTrackerAgent();
      
      const result = await tracker.setState({
        type: 'generate_health_score'
      });

      expect(result.overall).toBeDefined();
      expect(result.byCategory).toBeDefined();
    });
  });

  describe('Build Loop', () => {
    it('should run full build loop', async () => {
      const orchestrator = new AutonomousOrchestrator();
      
      const result = await orchestrator.setState({
        type: 'run_full_build_loop',
        maxIterations: 10
      });

      expect(result.iterations).toBeGreaterThan(0);
      expect(result.finalState).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('Reports', () => {
    it('should generate project reports', async () => {
      const orchestrator = new AutonomousOrchestrator();
      
      await orchestrator.setState({
        type: 'create_project_goal',
        goal: { title: 'Test', priority: 'high' }
      });

      const result = await orchestrator.setState({
        type: 'generate_report'
      });

      expect(result.summary).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should generate comprehensive reports', async () => {
      const orchestrator = new AutonomousOrchestrator();
      
      const result = await orchestrator.setState({
        type: 'generate_comprehensive_report'
      });

      expect(result.detailedReport).toBeDefined();
      expect(result.iterations).toBeDefined();
    });
  });
});
