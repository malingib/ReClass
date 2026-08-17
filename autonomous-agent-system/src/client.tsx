import { useAgent } from "agents/react";

export function AgentDashboard() {
  const [projectState, setLocalState] = useState<{
    projectPhase: string;
    activeTasks: any[];
    completedTasks: any[];
    projectGoals: any[];
    performanceMetrics: any;
    qaReport: any;
  }>({
    projectPhase: "planning",
    activeTasks: [],
    completedTasks: [],
    projectGoals: {},
    performanceMetrics: {
      buildTime: 0,
      testCoverage: 0,
      codeQualityScore: 100,
      deploymentSuccessRate: 0,
      averageResponseTime: 0
    },
    qaReport: null
  });

  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    priority: "medium"
  });

  const [currentTask, setCurrentTask] = useState("");
  const [agentLogs, setAgentLogs] = useState<string[]>([]);

  const agent = useAgent({
    agent: "AutonomousOrchestrator",
    name: "dashboard-user",
    onStateUpdate: (state) => {
      setLocalState({
        projectPhase: state.projectPhase,
        activeTasks: state.activeTasks,
        completedTasks: state.completedTasks,
        projectGoals: state.projectGoals,
        performanceMetrics: state.performanceMetrics,
        qaReport: state.qaReport
      });
    },
    onIdentity: (name, agentType) => {
      addLog(`Connected as ${name} (${agentType})`);
    }
  });

  const addLog = (message: string) => {
    setAgentLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  const handleCreateGoal = async () => {
    if (!newGoal.title) return;
    
    addLog(`Creating goal: ${newGoal.title}`);
    const result = await agent.setState({ type: "create_project_goal", goal: newGoal });
    if (result.success) {
      addLog(`Goal created with ID: ${result.goalId}`);
      setNewGoal({ title: "", description: "", priority: "medium" });
    }
  };

  const handleCreateTask = async () => {
    if (!currentTask) return;
    
    addLog(`Creating task: ${currentTask}`);
    const result = await agent.setState({ type: "create_task", task: { description: currentTask, role: "designer", priority: "high" } });
    if (result.success) {
      addLog(`Task created with ID: ${result.taskId}`);
      setCurrentTask("");
    }
  };

  const handleTransitionPhase = async (newPhase: string) => {
    await agent.setState({
      type: "transition_phase",
      newPhase,
      reason: "User-initiated phase transition"
    });
  };

  const handleRunBuildLoop = async () => {
    addLog("Starting full build loop...");
    const result = await agent.setState({ type: "run_full_build_loop", maxIterations: 50 });
    addLog(`Build loop completed in ${result.iterations} iterations`);
  };

  const handleGetReport = async () => {
    const report = await agent.setState({ type: "generate_report" });
    addLog(`Project Status: ${report.summary}`);
  };

  const handleExportState = async () => {
    const exported = await agent.setState({ type: "export_project_state" });
    console.log("Exported state:", exported);
    addLog("Project state exported successfully");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Autonomous Agent System</h1>

        {/* Phase Status */}
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Current Phase: {projectState.projectPhase}</h2>
          <div className="flex gap-4">
            <button
              onClick={() => handleTransitionPhase("planning")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Planning
            </button>
            <button
              onClick={() => handleTransitionPhase("design")}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
            >
              Design
            </button>
            <button
              onClick={() => handleTransitionPhase("implementation")}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            >
              Implementation
            </button>
            <button
              onClick={() => handleTransitionPhase("testing")}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
            >
              Testing
            </button>
            <button
              onClick={() => handleTransitionPhase("production")}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Production
            </button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Build Time</div>
            <div className="text-2xl font-bold">{projectState.performanceMetrics.buildTime}s</div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Test Coverage</div>
            <div className="text-2xl font-bold">{projectState.performanceMetrics.testCoverage}%</div>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">Avg Response Time</div>
            <div className="text-2xl font-bold">{projectState.performanceMetrics.averageResponseTime}ms</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={handleCreateGoal}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold"
          >
            Create Goal
          </button>
          <button
            onClick={handleCreateTask}
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 rounded-lg font-semibold"
          >
            Create Task
          </button>
          <button
            onClick={handleRunBuildLoop}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-semibold"
          >
            Run Build Loop
          </button>
          <button
            onClick={handleGetReport}
            className="px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-lg font-semibold"
          >
            Get Report
          </button>
          <button
            onClick={handleExportState}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold"
          >
            Export State
          </button>
        </div>

        {/* Goal Input */}
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Create New Goal</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Goal Title"
              value={newGoal.title}
              onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              className="px-4 py-2 bg-gray-700 rounded"
            />
            <select
              value={newGoal.priority}
              onChange={(e) => setNewGoal({ ...newGoal, priority: e.target.value as any })}
              className="px-4 py-2 bg-gray-700 rounded"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <textarea
            placeholder="Goal Description"
            value={newGoal.description}
            onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 rounded mb-4"
            rows={3}
          />
          <button
            onClick={handleCreateGoal}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded"
          >
            Create Goal
          </button>
        </div>

        {/* Task Input */}
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Create New Task</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Task Description"
              value={currentTask}
              onChange={(e) => setCurrentTask(e.target.value)}
              className="px-4 py-2 bg-gray-700 rounded col-span-2"
            />
          </div>
          <div className="flex gap-4 mt-4">
            <select
              value={""}
              onChange={(e) => setCurrentTask(e.target.value)}
              className="px-4 py-2 bg-gray-700 rounded"
            >
              <option value="">Select Agent Role...</option>
              <option value="designer">Designer</option>
              <option value="developer">Developer</option>
              <option value="backend">Backend</option>
              <option value="database">Database</option>
              <option value="performance">Performance</option>
              <option value="qa">QA</option>
            </select>
            <button
              onClick={handleCreateTask}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 rounded"
            >
              Create Task
            </button>
          </div>
        </div>

        {/* Active Tasks */}
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Active Tasks ({projectState.activeTasks.length})</h3>
          <div className="space-y-2">
            {projectState.activeTasks.map((task) => (
              <div key={task.id} className="p-4 bg-gray-700 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{task.description}</div>
                    <div className="text-sm text-gray-400">Role: {task.role}</div>
                    <div className="text-sm text-gray-400">Priority: {task.priority}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm ${
                    task.status === "completed" ? "bg-green-600" :
                    task.status === "failed" ? "bg-red-600" :
                    task.status === "in_progress" ? "bg-yellow-600" :
                    "bg-gray-600"
                  }`}>
                    {task.status}
                  </span>
                </div>
                {task.error && (
                  <div className="mt-2 text-red-400 text-sm">{task.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Completed Tasks ({projectState.completedTasks.length})</h3>
          <div className="space-y-2">
            {projectState.completedTasks.map((taskId) => {
              const task = projectState.activeTasks.find(t => t.id === taskId) ||
                Object.values(projectState.projectGoals).flatMap(g => g.tasks).find(t => t === taskId);
              
              if (!task) return null;
              
              return (
                <div key={taskId} className="p-4 bg-gray-700 rounded">
                  <div className="text-green-400 line-through">{task}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Goals */}
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Project Goals ({Object.keys(projectState.projectGoals).length})</h3>
          <div className="space-y-4">
            {Object.values(projectState.projectGoals).map((goal) => (
              <div key={goal.id} className="p-4 bg-gray-700 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{goal.title}</div>
                    <div className="text-sm text-gray-400">{goal.description}</div>
                    <div className="text-sm text-gray-400">Priority: {goal.priority}</div>
                    <div className="text-sm text-gray-400">Progress: {goal.progress}%</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm ${
                    goal.status === "completed" ? "bg-green-600" :
                    goal.status === "active" ? "bg-blue-600" :
                    "bg-red-600"
                  }`}>
                    {goal.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QA Report */}
        {projectState.qaReport && (
          <div className="mb-8 p-6 bg-gray-800 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 text-yellow-400">QA Report</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-gray-700 rounded">
                <div className="text-sm text-gray-400">Tests Run</div>
                <div className="text-2xl font-bold">{projectState.qaReport.testsRun}</div>
              </div>
              <div className="p-4 bg-gray-700 rounded">
                <div className="text-sm text-gray-400">Coverage</div>
                <div className="text-2xl font-bold">{projectState.qaReport.coverage}%</div>
              </div>
            </div>
            <div className="text-sm text-gray-400 mb-4">
              Bugs Found: {projectState.qaReport.bugsFound}
            </div>
            {projectState.qaReport.issues.length > 0 && (
              <div className="space-y-2">
                {projectState.qaReport.issues.map((issue, index) => (
                  <div key={index} className="p-4 bg-red-900 rounded">
                    <div className="font-semibold text-red-300">{issue.severity.toUpperCase()}</div>
                    <div>{issue.description}</div>
                    <div className="text-sm text-gray-400">{issue.location}</div>
                    <div className="text-sm text-green-400">{issue.fix}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Agent Logs */}
        <div className="p-6 bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Agent Logs</h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {agentLogs.map((log, index) => (
              <div key={index} className="text-sm text-gray-400 font-mono">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
