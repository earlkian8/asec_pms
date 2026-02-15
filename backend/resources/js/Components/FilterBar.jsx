import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Search } from 'lucide-react';

/**
 * Reusable filter bar: search input plus optional slot for filter controls and actions.
 * Use with list pages that need search + filter state and apply/reset.
 */
export default function FilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  onSubmit,
  onReset,
  activeFilterCount = 0,
  children,
  submitLabel = 'Apply',
  resetLabel = 'Clear',
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>
      {children}
      <div className="flex gap-2">
        {onSubmit && (
          <Button type="submit" variant="secondary" size="sm">
            {submitLabel}
          </Button>
        )}
        {onReset && (
          <Button type="button" variant="outline" size="sm" onClick={onReset}>
            {resetLabel}
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-gray-200 px-1.5 text-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
