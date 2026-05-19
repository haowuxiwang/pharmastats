import { useDataStore } from '../../stores/dataStore';
import { Badge } from '@/components/ui/badge';

export function ColumnSelector() {
  const { currentFile, selectedColumn, setSelectedColumn } = useDataStore();

  if (!currentFile) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4 p-3 rounded-lg bg-muted/50">
      <span className="text-sm font-medium text-muted-foreground">
        分析列：
      </span>
      {currentFile.columns.map((col) => {
        const isNumeric = currentFile.numeric_columns.includes(col);
        const isSelected = selectedColumn === col;

        return (
          <Badge
            key={col}
            variant={isSelected ? 'default' : 'outline'}
            className={`cursor-pointer text-xs ${
              !isNumeric ? 'opacity-40 cursor-not-allowed' : ''
            } ${isSelected ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            onClick={() => isNumeric && setSelectedColumn(col)}
          >
            {col}
            {!isNumeric && ' (文本)'}
          </Badge>
        );
      })}
    </div>
  );
}
