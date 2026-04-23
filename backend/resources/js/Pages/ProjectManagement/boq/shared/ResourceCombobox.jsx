import { useEffect, useMemo, useRef, useState } from "react";

export default function ResourceCombobox({
  options,
  value,
  onChange,
  placeholder,
  className = "",
  emptyText = "No results",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);

  const selected = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return options;

    return options.filter((option) =>
      option.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [options, query]);

  useEffect(() => {
    const handler = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setQuery("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const commitSelection = (optionValue) => {
    onChange(String(optionValue));
    setOpen(false);
    setQuery("");
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        return next >= filtered.length ? 0 : next;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? filtered.length - 1 : next;
      });
      return;
    }

    if (event.key === "Enter" && open && highlightedIndex >= 0) {
      event.preventDefault();
      const option = filtered[highlightedIndex];
      if (option) commitSelection(option.value);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
      setQuery("");
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={open ? query : selected?.label || ""}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setHighlightedIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-expanded={open}
        aria-autocomplete="list"
        className="h-9 w-full rounded-md border border-zinc-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
      />

      {open && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-400">{emptyText}</div>
          ) : (
            filtered.map((option, index) => {
              const isSelected = String(option.value) === String(value);
              const isHighlighted = highlightedIndex === index;

              return (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commitSelection(option.value);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-sm ${
                    isHighlighted
                      ? "bg-zinc-100"
                      : isSelected
                      ? "bg-zinc-50 font-medium text-zinc-900"
                      : "text-zinc-700"
                  }`}
                >
                  {option.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
