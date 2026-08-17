#!/usr/bin/env node

import { createServer } from 'http';
import { Agent, routeAgentRequest } from 'agents';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 8787;

class DemoAgent extends Agent {
  initialState = {
    counter: 0,
    messages: [],
    goals: [],
    tasks: []
  };

  @routeAgentRequest
  async handleRequest(req: Request) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === '/health') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          uptime: process.uptime(),
          timestamp: Date.now()
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (path === '/agents/demo-agent') {
      const agentName = url.searchParams.get('name') || 'demo';
      const agent = new DemoAgent();
      
      try {
        const response = await agent.handleAgentRequest(req);
        return response;
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Agent error', details: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response('Not Found', { status: 404 });
  }
}

const demoAgent = new DemoAgent();

const server = createServer(async (req, res) => {
  try {
    const response = await demoAgent.handleRequest(req);
    res.statusCode = response.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: response.status,
      timestamp: Date.now(),
      data: await response.json()
    }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message
    }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Autonomous Agent System is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Agent endpoint: http://localhost:${PORT}/agents/demo-agent`);
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('👋 Agent system stopped');
    process.exit(0);
  });
});
