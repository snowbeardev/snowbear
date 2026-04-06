import { describe, it, expect, vi } from 'vitest';
import { Agent } from './agent.js';
import { EventBus } from './event-bus.js';
import { ToolRegistry } from './tool.js';
import type { AgentContext, IncomingMessage } from './agent.js';
import type { LlmProvider, LlmResponse } from './llm.js';

function mockLlm(response: Partial<LlmResponse> = {}): LlmProvider {
  return {
    name: 'mock',
    chat: vi.fn(async () => ({
      content: response.content ?? 'Mock reply',
      toolCalls: response.toolCalls ?? [],
    })),
  };
}

function makeCtx(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    agentId: 'test-bot',
    eventBus: new EventBus(),
    tools: new ToolRegistry(),
    llm: mockLlm(),
    personality: { systemPrompt: 'You are a test bot.' },
    ...overrides,
  };
}

class EchoAgent extends Agent {
  async onMessage(message: IncomingMessage): Promise<string> {
    return `Echo: ${message.text}`;
  }
}

class ChatAgent extends Agent {
  async onMessage(message: IncomingMessage): Promise<string> {
    return this.chatSimple(message.text);
  }
}

describe('Agent', () => {
  it('processes messages via onMessage', async () => {
    const agent = new EchoAgent('echo', makeCtx());
    const result = await agent.onMessage({ channel: '#test', user: 'alice', text: 'hi' });
    expect(result).toBe('Echo: hi');
  });

  it('delegates onMention to onMessage by default', async () => {
    const agent = new EchoAgent('echo', makeCtx());
    const result = await agent.onMention({ channel: '#test', user: 'bob', text: '@echo hello' });
    expect(result).toBe('Echo: @echo hello');
  });

  it('calls onReady without error', async () => {
    const agent = new EchoAgent('echo', makeCtx());
    await expect(agent.onReady()).resolves.toBeUndefined();
  });

  it('chatSimple sends to LLM and returns content', async () => {
    const llm = mockLlm({ content: 'LLM says hi' });
    const agent = new ChatAgent('chat', makeCtx({ llm }));
    const result = await agent.onMessage({ channel: '#test', user: 'alice', text: 'hello' });
    expect(result).toBe('LLM says hi');
    expect(llm.chat).toHaveBeenCalled();
  });

  it('chatSimple handles tool calls', async () => {
    const callCount = { n: 0 };
    const llm: LlmProvider = {
      name: 'mock',
      chat: vi.fn(async () => {
        callCount.n++;
        if (callCount.n === 1) {
          return {
            content: null,
            toolCalls: [{ id: 'tc1', name: 'greet', arguments: { name: 'World' } }],
          };
        }
        return { content: 'Done!', toolCalls: [] };
      }),
    };

    const tools = new ToolRegistry();
    tools.register({
      name: 'greet',
      description: 'Greet',
      parameters: [{ name: 'name', type: 'string', description: 'Who', required: true }],
      execute: async (params) => `Hello ${params.name}`,
    });

    const agent = new ChatAgent('chat', makeCtx({ llm, tools }));
    const result = await agent.onMessage({ channel: '#test', user: 'alice', text: 'greet world' });
    expect(result).toBe('Done!');
    expect(llm.chat).toHaveBeenCalledTimes(2);
  });

  it('registerTool adds a tool to the registry', () => {
    const ctx = makeCtx();
    const agent = new EchoAgent('echo', ctx);
    agent.registerTool({
      name: 'test',
      description: 'A test tool',
      parameters: [],
      execute: async () => 'ok',
    });
    expect(ctx.tools.get('test')).toBeDefined();
  });
});
