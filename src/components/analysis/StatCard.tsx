import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'good' | 'warning' | 'danger';
  decimals?: number;
}

const STATUS_CONFIG = {
  good: { variant: 'default' as const, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  warning: { variant: 'default' as const, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  danger: { variant: 'destructive' as const, className: '' },
};

export function StatCard({
  label,
  value,
  unit,
  status,
  decimals,
}: StatCardProps) {
  const displayValue =
    typeof value === 'number' && decimals !== undefined
      ? value.toFixed(decimals)
      : String(value);

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          {status && (
            <Badge
              variant={STATUS_CONFIG[status].variant}
              className={`text-[10px] px-1.5 py-0 ${STATUS_CONFIG[status].className}`}
            >
              {status === 'good' ? 'OK' : status === 'warning' ? '!' : '!!'}
            </Badge>
          )}
        </div>
        <div className="text-xl font-bold">
          {displayValue}
          {unit && (
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {unit}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
