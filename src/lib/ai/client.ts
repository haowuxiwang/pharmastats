/**
 * AI Client - LLM API integration with OpenAI-compatible tool calling + SSE streaming.
 */

import type { AIConfig } from '../../types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  content: string;
  tool_calls?: ToolCall[];
  error?: string;
}

export interface StreamChunk {
  type: 'content' | 'tool_calls' | 'done' | 'error';
  content?: string;
  tool_calls?: ToolCall[];
  error?: string;
}

const PROVIDER_CONFIGS: Record<string, { baseUrl: string; model: string }> = {
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  siliconflow: { baseUrl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
};

export function getProviderConfig(provider: string) {
  return PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.deepseek;
}

function buildBody(options: ChatCompletionOptions, model: string): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.max_tokens ?? 2000,
  };
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options.tool_choice ?? 'auto';
  }
  return body;
}

/** Non-streaming completion */
export async function chatCompletion(
  config: AIConfig,
  options: ChatCompletionOptions,
): Promise<ChatResponse> {
  if (!config.apiKey) return { content: '', error: 'API key not configured' };

  const baseUrl = config.baseUrl || getProviderConfig(config.provider).baseUrl;
  const model = config.model || getProviderConfig(config.provider).model;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify(buildBody(options, model)),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { content: '', error: errorData.error?.message || `API error: ${response.status}` };
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    return { content: message?.content || '', tool_calls: message?.tool_calls || undefined };
  } catch (error) {
    return { content: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/** Streaming completion - yields chunks as they arrive via SSE */
export async function* chatCompletionStream(
  config: AIConfig,
  options: ChatCompletionOptions,
): AsyncGenerator<StreamChunk> {
  if (!config.apiKey) {
    yield { type: 'error', error: 'API key not configured' };
    return;
  }

  const baseUrl = config.baseUrl || getProviderConfig(config.provider).baseUrl;
  const model = config.model || getProviderConfig(config.provider).model;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ ...buildBody(options, model), stream: true }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      yield { type: 'error', error: errorData.error?.message || `API error: ${response.status}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', error: 'No response body' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    // Accumulate tool calls across chunks
    const toolCallsMap: Map<number, { id: string; type: 'function'; function: { name: string; arguments: string } }> = new Map();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          // Yield accumulated tool calls if any
          if (toolCallsMap.size > 0) {
            yield { type: 'tool_calls', tool_calls: Array.from(toolCallsMap.values()) };
          }
          yield { type: 'done' };
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          // Content chunks
          if (delta.content) {
            yield { type: 'content', content: delta.content };
          }

          // Tool call chunks (streamed incrementally)
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallsMap.has(idx)) {
                toolCallsMap.set(idx, { id: tc.id || '', type: 'function', function: { name: '', arguments: '' } });
              }
              const existing = toolCallsMap.get(idx)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.function.name += tc.function.name;
              if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
            }
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    // If we got here without [DONE], yield any accumulated tool calls
    if (toolCallsMap.size > 0) {
      yield { type: 'tool_calls', tool_calls: Array.from(toolCallsMap.values()) };
    }
    yield { type: 'done' };
  } catch (error) {
    yield { type: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
