import { describe, it, expect, vi } from 'vitest';
import { ToolRegistry } from './tool.js';
import type { ToolDefinition } from './tool.js';

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'greet',
    description: 'Says hello',
    parameters: [{ name: 'name', type: 'string', description: 'Who to greet', required: true }],
    execute: vi.fn(async (params) => `Hello, ${params.name}!`),
    ...overrides,
  };
}

describe('ToolRegistry', () => {
  it('registers and lists tools', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool());
    expect(registry.list()).toHaveLength(1);
    expect(registry.get('greet')?.name).toBe('greet');
  });

  it('rejects duplicate registrations', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool());
    expect(() => registry.register(makeTool())).toThrow('already registered');
  });

  it('executes a tool with valid params', async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool());
    const result = await registry.execute('greet', { name: 'World' });
    expect(result).toBe('Hello, World!');
  });

  it('throws on unknown tool', async () => {
    const registry = new ToolRegistry();
    await expect(registry.execute('nope', {})).rejects.toThrow('Unknown tool');
  });

  it('validates required parameters', async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool());
    await expect(registry.execute('greet', {})).rejects.toThrow('Missing required parameter');
  });

  it('validates parameter types', async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool());
    await expect(registry.execute('greet', { name: 123 })).rejects.toThrow('must be string');
  });

  it('generates schema', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool());
    const schema = registry.toSchema();
    expect(schema).toHaveLength(1);
    expect(schema[0].name).toBe('greet');
    expect(schema[0].parameters).toHaveLength(1);
  });

  it('unregisters tools', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool());
    registry.unregister('greet');
    expect(registry.get('greet')).toBeUndefined();
  });
});
