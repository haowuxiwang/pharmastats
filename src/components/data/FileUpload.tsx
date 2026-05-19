import { useState, useCallback } from 'react';
import { ipc } from '../../lib/ipc';
import { useDataStore } from '../../stores/dataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChatStore } from '../../stores/chatStore';
import { runAutoAnalysis } from '../../lib/ai/autoAnalysis';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploadProps {
  onFileLoaded: () => void;
}

export function FileUpload({ onFileLoaded }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setCurrentFile, setSelectedColumn } = useDataStore();
  const aiConfig = useSettingsStore((s) => s.settings.ai);
  const { addMessage, setOpen: setChatOpen } = useChatStore();

  const handleFile = useCallback(async (filePath?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      let path = filePath;
      if (!path) {
        const paths = await ipc.openFile();
        if (paths.length === 0) { setIsLoading(false); return; }
        path = paths[0];
      }

      const result = await ipc.parseFile(path);

      if (result.success) {
        setCurrentFile(result);
        if (result.numeric_columns.length > 0) {
          setSelectedColumn(result.numeric_columns[0]);
        }
        onFileLoaded();

        // Auto-analysis if AI is enabled
        if (aiConfig.enabled && aiConfig.apiKey) {
          setChatOpen(true);
          addMessage({ role: 'assistant', content: '正在自动分析数据，请稍候...' });

          try {
            const analysis = await runAutoAnalysis(result, aiConfig);
            // Replace the "analyzing" message with the result
            useChatStore.getState().updateLastMessage({
              content: analysis.summary,
            });
          } catch (err) {
            useChatStore.getState().updateLastMessage({
              content: `自动分析失败: ${err instanceof Error ? err.message : 'Unknown error'}`,
            });
          }
        }
      } else {
        setError(result.error || 'Failed to parse file');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentFile, setSelectedColumn, onFileLoaded, aiConfig, addMessage, setChatOpen]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = await ipc.parseBuffer(file.name, buffer);

      if (result.success) {
        setCurrentFile(result);
        if (result.numeric_columns.length > 0) {
          setSelectedColumn(result.numeric_columns[0]);
        }
        onFileLoaded();

        if (aiConfig.enabled && aiConfig.apiKey) {
          setChatOpen(true);
          addMessage({ role: 'assistant', content: '正在自动分析数据，请稍候...' });
          try {
            const analysis = await runAutoAnalysis(result, aiConfig);
            useChatStore.getState().updateLastMessage({ content: analysis.summary });
          } catch (err) {
            useChatStore.getState().updateLastMessage({
              content: `自动分析失败: ${err instanceof Error ? err.message : 'Unknown error'}`,
            });
          }
        }
      } else {
        setError(result.error || 'Failed to parse file');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentFile, setSelectedColumn, onFileLoaded, aiConfig, addMessage, setChatOpen]);

  return (
    <div className="flex flex-col items-center justify-center p-10 flex-1">
      <Card
        className={`w-full max-w-md cursor-pointer transition-all ${
          isDragOver ? 'border-amber-500 bg-amber-50 dark:bg-amber-950' : ''
        } ${isLoading ? 'pointer-events-none opacity-70' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => handleFile()}
      >
        <CardContent className="py-16 text-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-3 border-muted border-t-amber-600 rounded-full animate-spin" />
              <p className="text-muted-foreground">正在解析文件...</p>
            </div>
          ) : (
            <>
              <div className="text-5xl mb-4">📊</div>
              <h2 className="text-lg font-semibold mb-2">拖拽文件到此处或点击选择</h2>
              <p className="text-sm text-muted-foreground">
                支持 Excel (.xlsx/.xls)、CSV、PDF 格式
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="mt-4 p-3 max-w-md w-full bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
