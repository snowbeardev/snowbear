import type { EventBus } from './event-bus.js';
import type { ToolDefinition, ToolRegistry } from './tool.js';
import type { LlmProvider, LlmMessage, LlmResponse } from './llm.js';

export interface AgentPersonality {
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface IncomingMessage {
  channel: string;
  user: string;
  text: string;
  threadId?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentContext {
  agentId: string;
  eventBus: EventBus;
  tools: ToolRegistry;
  llm: LlmProvider;
  personality: AgentPersonality;
}

export abstract class Agent {
  readonly id: string;
  protected ctx: AgentContext;

  constructor(id: string, ctx: AgentContext) {
    this.id = id;
    this.ctx = ctx;
  }

  async onReady(): Promise<void> {
    // Override in subclass
  }

  abstract onMessage(message: IncomingMessage): Promise<string | null>;

  async onMention(message: IncomingMessage): Promise<string | null> {
    return this.onMessage(message);
  }

  async onError(error: Error): Promise<void> {
    console.error(`[${this.id}] Error:`, error.message);
  }

  protected async chat(messages: LlmMessage[]): Promise<LlmResponse> {
    const systemMsg: LlmMessage = {
      role: 'system',
      content: this.ctx.personality.systemPrompt,
    };
    return this.ctx.llm.chat([systemMsg, ...messages], this.ctx.tools.list());
  }

  protected async chatSimple(userMessage: string): Promise<string> {
    const response = await this.chat([{ role: 'user', content: userMessage }]);

    // Handle tool calls in a loop
    let currentMessages: LlmMessage[] = [{ role: 'user', content: userMessage }];
    let currentResponse = response;

    while (currentResponse.toolCalls.length > 0) {
      if (currentResponse.content) {
        currentMessages.push({ role: 'assistant', content: currentResponse.content });
      }

      for (const call of currentResponse.toolCalls) {
        const result = await this.ctx.tools.execute(call.name, call.arguments);
        currentMessages.push({
          role: 'tool',
          content: JSON.stringify(result),
          toolCallId: call.id,
          name: call.name,
        });
      }

      currentResponse = await this.chat(currentMessages);
    }

    return currentResponse.content ?? '';
  }

  registerTool(tool: ToolDefinition): void {
    this.ctx.tools.register(tool);
  }
}
