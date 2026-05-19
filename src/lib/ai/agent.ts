/**
 * AI Agent orchestrator - implements the OpenAI tool-calling agentic loop with streaming.
 */

import {
  chatCompletionStream,
  type ChatMessage,
  type ToolCall,
  type ToolDefinition,
} from './client';
import type { AIConfig, ParsedData } from '../../types';
import type { ToolExecutor } from './tools';

export interface AgentConfig {
  aiConfig: AIConfig;
  tools: ToolDefinition[];
  toolExecutors: ToolExecutor[];
  systemPrompt: string;
  maxIterations?: number;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export type AgentEvent =
  | { type: 'content'; content: string }
  | { type: 'tool_start'; name: string; args: string }
  | { type: 'tool_result'; name: string; result: string }
  | { type: 'done' }
  | { type: 'error'; error: string };

/**
 * Run the agent loop with streaming. Yields events as they happen.
 * The caller can use these to update the UI in real-time.
 */
export async function* runAgent(
  config: AgentConfig,
  data: ParsedData,
  userMessage: string,
  history: AgentMessage[],
): AsyncGenerator<AgentEvent> {
  const { aiConfig, tools, toolExecutors, systemPrompt, maxIterations = 10 } = config;

  // Build messages array
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({
      role: m.role,
      content: m.content,
      tool_calls: m.tool_calls,
      tool_call_id: m.tool_call_id,
      name: m.name,
    })),
    { role: 'user', content: userMessage },
  ];

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let fullContent = '';
    let toolCalls: ToolCall[] | undefined;

    // Stream the LLM response
    for await (const chunk of chatCompletionStream(aiConfig, { messages, tools })) {
      if (chunk.type === 'content' && chunk.content) {
        fullContent += chunk.content;
        yield { type: 'content', content: chunk.content };
      }
      if (chunk.type === 'tool_calls' && chunk.tool_calls) {
        toolCalls = chunk.tool_calls;
      }
      if (chunk.type === 'error') {
        yield { type: 'error', error: chunk.error || 'Unknown error' };
        return;
      }
    }

    // If no tool calls, we're done
    if (!toolCalls || toolCalls.length === 0) {
      yield { type: 'done' };
      return;
    }

    // Execute tool calls
    // First, add the assistant message with tool_calls to messages
    messages.push({
      role: 'assistant',
      content: fullContent || null,
      tool_calls: toolCalls,
    });

    for (const tc of toolCalls) {
      const executor = toolExecutors.find((e) => e.name === tc.function.name);

      yield {
        type: 'tool_start',
        name: tc.function.name,
        args: tc.function.arguments,
      };

      let resultStr: string;
      if (executor) {
        try {
          const args = JSON.parse(tc.function.arguments);
          const result = await executor.execute(args, data);
          resultStr = JSON.stringify(result, null, 2);
        } catch (err) {
          resultStr = JSON.stringify({
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        resultStr = JSON.stringify({ error: `Unknown tool: ${tc.function.name}` });
      }

      yield {
        type: 'tool_result',
        name: tc.function.name,
        result: resultStr,
      };

      // Add tool result to messages
      messages.push({
        role: 'tool',
        content: resultStr,
        tool_call_id: tc.id,
        name: tc.function.name,
      });
    }

    // Continue the loop - the LLM will process tool results
  }

  yield { type: 'error', error: `达到最大迭代次数 (${maxIterations})` };
}
