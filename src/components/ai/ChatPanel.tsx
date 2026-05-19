import { useRef, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore } from '../../stores/chatStore';
import { useDataStore } from '../../stores/dataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { runAgent } from '../../lib/ai/agent';
import { getToolDefinitions, getToolExecutors } from '../../lib/ai/tools';
import { SYSTEM_PROMPT } from '../../lib/ai/prompts';

export function ChatPanel() {
  const { isOpen, setOpen, messages, isStreaming, setStreaming, addMessage, appendToLast, updateLastMessage, clearMessages } = useChatStore();
  const currentFile = useDataStore((s) => s.currentFile);
  const aiConfig = useSettingsStore((s) => s.settings.ai);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (viewportRef.current) {
      const el = viewportRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(
    async (userMessage: string) => {
      if (!currentFile || !aiConfig.apiKey || isStreaming) return;

      // Add user message
      addMessage({ role: 'user', content: userMessage });

      // Add empty assistant message for streaming
      addMessage({ role: 'assistant', content: '', isStreaming: true });
      setStreaming(true);

      const tools = getToolDefinitions(currentFile);
      const toolExecutors = getToolExecutors();

      // Build history (excluding the empty assistant message we just added)
      const history = messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'tool',
        content: m.content,
        tool_call_id: m.toolCallId,
        name: m.toolName,
      }));

      try {
        for await (const event of runAgent(
          { aiConfig, tools, toolExecutors, systemPrompt: SYSTEM_PROMPT },
          currentFile,
          userMessage,
          history,
        )) {
          switch (event.type) {
            case 'content':
              appendToLast(event.content);
              break;
            case 'tool_start':
              // Update the last message to show tool is running
              updateLastMessage({
                content: `正在调用工具: ${event.name}...`,
              });
              break;
            case 'tool_result':
              // Add tool result as a separate message
              addMessage({
                role: 'tool',
                content: event.result.length > 500 ? event.result.slice(0, 500) + '...' : event.result,
                toolName: event.name,
              });
              // Add new assistant message for the next response
              addMessage({ role: 'assistant', content: '', isStreaming: true });
              break;
            case 'done':
              updateLastMessage({ isStreaming: false });
              break;
            case 'error':
              updateLastMessage({
                content: `错误: ${event.error}`,
                isStreaming: false,
              });
              break;
          }
        }
      } catch (err) {
        updateLastMessage({
          content: `错误: ${err instanceof Error ? err.message : 'Unknown error'}`,
          isStreaming: false,
        });
      } finally {
        setStreaming(false);
      }
    },
    [currentFile, aiConfig, isStreaming, messages, addMessage, appendToLast, updateLastMessage, setStreaming],
  );

  return (
    <>
      {/* Floating toggle button */}
      {!isOpen && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50 bg-amber-600 hover:bg-amber-700"
          size="icon"
        >
          <span className="text-lg font-bold">AI</span>
        </Button>
      )}

      {/* Sheet panel */}
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent className="w-[420px] sm:w-[420px] p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base">AI 分析助手</SheetTitle>
              <div className="flex gap-2">
                {messages.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearMessages}>
                    清空
                  </Button>
                )}
                {!aiConfig.apiKey && (
                  <Badge variant="destructive" className="text-[10px]">
                    未配置 API Key
                  </Badge>
                )}
                {!currentFile && (
                  <Badge variant="outline" className="text-[10px]">
                    未加载数据
                  </Badge>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={viewportRef}>
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-10">
                <p className="mb-2">你好！我是 AI 数据分析助手。</p>
                <p className="text-xs">上传数据后，可以问我任何分析问题。</p>
                <div className="mt-6 space-y-2 text-xs text-left">
                  <p className="text-muted-foreground">示例问题：</p>
                  <div className="p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => handleSend('帮我分析一下数据的整体情况')}>
                    帮我分析一下数据的整体情况
                  </div>
                  <div className="p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => currentFile?.numeric_columns[0] && handleSend(`分析 ${currentFile.numeric_columns[0]} 列的正态性`)}>
                    {currentFile?.numeric_columns[0] ? `分析 ${currentFile.numeric_columns[0]} 列的正态性` : '分析某列的正态性'}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
            )}
          </ScrollArea>

          {/* Input */}
          <ChatInput onSend={handleSend} disabled={isStreaming || !aiConfig.apiKey} />
        </SheetContent>
      </Sheet>
    </>
  );
}
