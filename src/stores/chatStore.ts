import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolName?: string;
  toolCallId?: string;
  isStreaming?: boolean;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isStreaming: boolean;

  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  appendToLast: (content: string) => void;
  updateLastMessage: (updates: Partial<ChatMessage>) => void;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
}

let nextId = 1;
function genId() {
  return `msg-${nextId++}`;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isOpen: false,
  isStreaming: false,

  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, { ...msg, id: genId(), timestamp: Date.now() }],
    })),

  appendToLast: (content) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last) {
        msgs[msgs.length - 1] = { ...last, content: last.content + content };
      }
      return { messages: msgs };
    }),

  updateLastMessage: (updates) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last) {
        msgs[msgs.length - 1] = { ...last, ...updates };
      }
      return { messages: msgs };
    }),

  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  clearMessages: () => set({ messages: [], isStreaming: false }),
}));
