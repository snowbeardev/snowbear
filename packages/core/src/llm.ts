import type { ToolDefinition } from './tool.js';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LlmResponse {
  content: string | null;
  toolCalls: LlmToolCall[];
}

export interface LlmProviderConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmProvider {
  readonly name: string;
  chat(messages: LlmMessage[], tools?: ToolDefinition[]): Promise<LlmResponse>;
}

export class OpenAiProvider implements LlmProvider {
  readonly name = 'openai';
  private config: LlmProviderConfig;

  constructor(config: LlmProviderConfig) {
    this.config = config;
  }

  async chat(messages: LlmMessage[], tools?: ToolDefinition[]): Promise<LlmResponse> {
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
      })),
      temperature: this.config.temperature ?? 0.7,
      ...(this.config.maxTokens ? { max_tokens: this.config.maxTokens } : {}),
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: {
            type: 'object',
            properties: Object.fromEntries(
              t.parameters.map((p) => [p.name, { type: p.type, description: p.description }]),
            ),
            required: t.parameters.filter((p) => p.required).map((p) => p.name),
          },
        },
      }));
    }

    const baseUrl = this.config.baseUrl ?? 'https://api.openai.com/v1';
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as {
      choices: Array<{
        message: {
          content: string | null;
          tool_calls?: Array<{
            id: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };

    const choice = data.choices[0];
    return {
      content: choice.message.content,
      toolCalls: (choice.message.tool_calls ?? []).map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      })),
    };
  }
}

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private config: LlmProviderConfig;

  constructor(config: LlmProviderConfig) {
    this.config = config;
  }

  async chat(messages: LlmMessage[], tools?: ToolDefinition[]): Promise<LlmResponse> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: this.config.maxTokens ?? 4096,
      messages: nonSystemMessages.map((m) => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content:
          m.role === 'tool'
            ? [{ type: 'tool_result', tool_use_id: m.toolCallId, content: m.content }]
            : m.content,
      })),
      ...(systemMessage ? { system: systemMessage.content } : {}),
      ...(this.config.temperature != null ? { temperature: this.config.temperature } : {}),
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: {
          type: 'object',
          properties: Object.fromEntries(
            t.parameters.map((p) => [p.name, { type: p.type, description: p.description }]),
          ),
          required: t.parameters.filter((p) => p.required).map((p) => p.name),
        },
      }));
    }

    const baseUrl = this.config.baseUrl ?? 'https://api.anthropic.com/v1';
    const res = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as {
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
      >;
    };

    let textContent = '';
    const toolCalls: LlmToolCall[] = [];

    for (const block of data.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input,
        });
      }
    }

    return {
      content: textContent || null,
      toolCalls,
    };
  }
}

export function createProvider(config: LlmProviderConfig): LlmProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAiProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider as string}`);
  }
}
