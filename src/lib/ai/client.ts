/**
 * AI Client - LLM API integration with OpenAI-compatible tool calling + SSE streaming.
 * Features: AbortController, configurable timeout, retry for transient errors.
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

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

export function getProviderConfig(provider: string) {
  return PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.deepseek;
}

// ── Abort control ──────────────────────────────────────────────────────────

let activeController: AbortController | null = null;

/** Abort the currently active streaming request. */
export function abortActiveRequest() {
  activeController?.abort();
  activeController = null;
}

/** Check if the current request was aborted. */
export function isAborted(): boolean {
  return activeController?.signal.aborted ?? false;
}

// ── Helpers ────────────────────────────────────────────────────────────────

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

function getRetryAfterMs(response: Response): number | null {
  const header = response.headers.get('Retry-After');
  if (!header) return null;
  const seconds = Number(header);
  return isNaN(seconds) ? null : seconds * 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Non-streaming completion ───────────────────────────────────────────────

export async function chatCompletion(
  config: AIConfig,
  options: ChatCompletionOptions,
): Promise<ChatResponse> {
  if (!config.apiKey) return { content: '', error: 'API key not configured' };

  const baseUrl = config.baseUrl || getProviderConfig(config.provider).baseUrl;
  const model = config.model || getProviderConfig(config.provider).model;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    let response: Response | null = null;
    let lastError = '';

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = RETRYABLE_STATUS.has(response?.status ?? 0)
          ? (getRetryAfterMs(response!) ?? 2 ** attempt * 1000)
          : 2 ** attempt * 1000;
        await sleep(delay);
      }

      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify(buildBody(options, model)),
        signal: controller.signal,
      });

      if (response.ok) break;

      const errorData = await response.json().catch(() => ({}));
      lastError = errorData.error?.message || `API error: ${response.status}`;

      if (!RETRYABLE_STATUS.has(response.status)) break;
    }

    clearTimeout(timeoutId);

    if (!response!.ok) {
      return { content: '', error: lastError };
    }

    const data = await response!.json();
    const message = data.choices?.[0]?.message;
    return { content: message?.content || '', tool_calls: message?.tool_calls || undefined };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { content: '', error: '请求超时或已取消' };
    }
    return { content: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ── Streaming completion ───────────────────────────────────────────────────

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

  // Create and register abort controller
  activeController = new AbortController();
  const timeoutId = setTimeout(() => activeController?.abort(), DEFAULT_TIMEOUT_MS);

  try {
    let response: Response | null = null;
    let lastError = '';

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = RETRYABLE_STATUS.has(response?.status ?? 0)
          ? (getRetryAfterMs(response!) ?? 2 ** attempt * 1000)
          : 2 ** attempt * 1000;
        await sleep(delay);
      }

      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ ...buildBody(options, model), stream: true }),
        signal: activeController.signal,
      });

      if (response.ok) break;

      const errorData = await response.json().catch(() => ({}));
      lastError = errorData.error?.message || `API error: ${response.status}`;

      if (!RETRYABLE_STATUS.has(response.status)) break;
    }

    if (!response!.ok) {
      yield { type: 'error', error: lastError };
      return;
    }

    const reader = response!.body?.getReader();
    if (!reader) {
      yield { type: 'error', error: 'No response body' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const toolCallsMap: Map<number, { id?: string; type: 'function'; function: { name: string; arguments: string } }> = new Map();

    while (true) {
      if (activeController.signal.aborted) {
        yield { type: 'error', error: '请求已取消' };
        return;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Handle both "data: [DONE]" and "data:[DONE]" formats
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed.slice(5);

        if (data === '[DONE]') {
          if (toolCallsMap.size > 0) {
            yield { type: 'tool_calls', tool_calls: Array.from(toolCallsMap.values()) as ToolCall[] };
          }
          yield { type: 'done' };
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            yield { type: 'content', content: delta.content };
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallsMap.has(idx)) {
                toolCallsMap.set(idx, { type: 'function', function: { name: '', arguments: '' } });
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

    // Stream ended without [DONE]
    if (toolCallsMap.size > 0) {
      yield { type: 'tool_calls', tool_calls: Array.from(toolCallsMap.values()) as ToolCall[] };
    }
    yield { type: 'done' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      yield { type: 'error', error: '请求超时或已取消' };
    } else {
      yield { type: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  } finally {
    clearTimeout(timeoutId);
    activeController = null;
  }
}
