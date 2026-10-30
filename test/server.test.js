import test from 'node:test';
import assert from 'node:assert/strict';
import { recordLog, logs } from '../src/server.js';

test('recordLog stores the required audit fields', () => {
  logs.length = 0;
  const entry = recordLog({ service: 'inventory', operation: 'list', status: 'SUCCESS', durationMs: 42, requestId: 'test-id' });
  assert.deepEqual(entry, { requestId: 'test-id', timestamp: entry.timestamp, service: 'inventory', operation: 'list', durationMs: 42, status: 'SUCCESS' });
  assert.equal(logs[0].requestId, 'test-id');
});
