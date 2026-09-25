// ============================================
// Table Component - Professional Aurora Data Grid
// ============================================

import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (item: T, index?: number) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (item: T) => void;
  onRowDoubleClick?: (item: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  selectedId?: string;
}

export function Table<T>({ columns, data, keyField, onRowClick, onRowDoubleClick, emptyMessage = 'No data available', isLoading = false, selectedId }: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="bg-white border border-[#E8EDF5] rounded-[8px] overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.045)]">
        <div className="flex items-center justify-center py-14">
          <div className="flex items-center gap-3 text-slate-500">
            <svg className="animate-spin h-5 w-5 text-amber-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            <span className="text-sm font-bold">Loading records...</span>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white border border-[#E8EDF5] rounded-[8px] overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.045)]">
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-16 h-16 rounded-[8px] bg-amber-50 text-amber-600 text-3xl flex items-center justify-center mb-3">📦</div>
          <p className="text-lg font-bold text-slate-900">No Records Found</p>
          <p className="text-sm font-medium text-slate-500 mt-1">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E8EDF5] rounded-[8px] overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.045)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] table-auto">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((column) => (
                <th key={column.key} className={`px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600 ${column.width || ''}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, index) => {
              const itemKey = item[keyField];
              const keyValue = typeof itemKey === 'string' || typeof itemKey === 'number' ? String(itemKey) : String(index);
              const isSelected = selectedId === keyValue;
              return (
                <tr
                  key={keyValue}
                  onClick={() => onRowClick?.(item)}
                  onDoubleClick={() => onRowDoubleClick?.(item)}
                  className={`transition-all duration-150 ${onRowClick || onRowDoubleClick ? 'cursor-pointer hover:bg-amber-50/60' : ''} ${isSelected ? 'bg-amber-50 text-amber-900' : 'text-slate-700'}`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3.5 align-middle text-[13px] font-semibold whitespace-normal break-words leading-normal">
                      {column.render ? column.render(item, index) : String((item as Record<string, unknown>)[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: 'safe' | 'warning' | 'danger' | 'expired';
  text: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text }) => {
  const statusStyles = {
    safe: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700 animate-pulse',
    expired: 'bg-red-100 text-red-700 animate-blink',
  };
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusStyles[status]}`}>{text}</span>;
};
