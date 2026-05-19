import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ChatMessage as ChatMessageType } from '../../stores/chatStore';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  const isSystem = message.role === 'system';

  if (isSystem) return null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-1'}`}>
        {isTool ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Badge variant="outline" className="text-[10px]">
              {message.toolName || 'tool'}
            </Badge>
            <span>工具调用完成</span>
          </div>
        ) : (
          <div className={`text-xs mb-1 ${isUser ? 'text-right' : 'text-left'} text-muted-foreground`}>
            {isUser ? '你' : 'AI 助手'}
          </div>
        )}

        <Card className={isUser ? 'bg-amber-600 text-white' : ''}>
          <CardContent className="py-2 px-3 text-sm">
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
              </div>
            )}
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-muted-foreground animate-pulse ml-0.5" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
