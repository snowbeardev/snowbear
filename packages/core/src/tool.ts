export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  async execute(name: string, params: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    this.validate(tool, params);
    return tool.execute(params);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  toSchema(): Array<{ name: string; description: string; parameters: ToolParameter[] }> {
    return this.list().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }

  private validate(tool: ToolDefinition, params: Record<string, unknown>): void {
    for (const param of tool.parameters) {
      if (param.required && !(param.name in params)) {
        throw new Error(`Missing required parameter "${param.name}" for tool "${tool.name}"`);
      }
      if (param.name in params) {
        const value = params[param.name];
        if (typeof value !== param.type) {
          throw new Error(
            `Parameter "${param.name}" for tool "${tool.name}" must be ${param.type}, got ${typeof value}`,
          );
        }
      }
    }
  }
}
