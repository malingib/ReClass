#!/usr/bin/env node

import { Worker } from 'agents';
import type { Env } from 'agents';

console.log('🚀 Starting Autonomous Agent System...');

const agent = new Worker<Env>({
  maxMemory: '512MB',
  maxWorkers: 5,
  maxConcurrent: 3,
  timeout: 300000
});

agent.on('ready', () => {
  console.log('✅ Agent system is ready');
});

agent.on('message', (message) => {
  console.log('📨 Received message:', message);
});

agent.on('error', (error) => {
  console.error('❌ Error:', error);
});

agent.start();
