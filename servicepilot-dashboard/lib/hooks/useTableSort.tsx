/**
 * useTableSort — client-side sort + search for loaded data arrays.
 *
 * Usage:
 *   const { sorted, search, setSearch, sortKey, sortDir, toggleSort } = useTableSort(rows, defaultSortKey);
 *
 * - search     → current search string
 * - setSearch  → updates search (filters ALL string fields of each row)
 * - sortKey    → column currently sorted on
 * - sortDir    → 'asc' | 'desc'
 * - toggleSort → call with a key to sort/toggle direction
 * - sorted     → filtered + sorted array to render
 */

import { useState, useMemo } from 'react';

type SortDir = 'asc' | 'desc';

export function useTableSort<T extends Record<string, any>>(
  data: T[],
  defaultKey = '',
  defaultDir: SortDir = 'asc'
) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const toggleSort = (key: string) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    let result = data;

    // Filter: check if any string value contains the search term
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(v =>
          v != null && String(v).toLowerCase().includes(q)
        )
      );
    }

    // Sort
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return sortDir === 'asc' ? 1 : -1;
        if (bv == null) return sortDir === 'asc' ? -1 : 1;
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, sortKey, sortDir]);

  return { sorted, search, setSearch, sortKey, sortDir, toggleSort };
}

/** Renders a column header <th> with sort indicators. */
export function thCls(sortKey: string, col: string, sortDir: 'asc' | 'desc') {
  const active = sortKey === col;
  return `cursor-pointer select-none px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider transition-colors ${active ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'}`;
}

/** Returns the sort arrow character for a column header. */
export function SortArrow({ col, sortKey, sortDir }: { col: string; sortKey: string; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== col) return <span className="ml-1 opacity-20">↕</span>;
  return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}
