import { useState } from "react";

interface AdvancedFiltersProps {
  onSearchChange: (query: string) => void;
  onSortChange: (sort: "score" | "price-asc" | "price-desc" | "weekly") => void;
  resultCount?: number;
}

type SortOption = "score" | "price-asc" | "price-desc" | "weekly";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "score", label: "⭐ Score (Yuqori)" },
  { value: "price-asc", label: "💰 Narx (Pastdan)" },
  { value: "price-desc", label: "💰 Narx (Yuqoridan)" },
  { value: "weekly", label: "📊 Haftalik sotuv" },
];

export default function AdvancedFilters({
  onSearchChange,
  onSortChange,
  resultCount,
}: AdvancedFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("score");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearchChange(query);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sort = e.target.value as SortOption;
    setSortBy(sort);
    onSortChange(sort);
  };

  return (
    <div className="space-y-2">
      {/* Search Input */}
      <div className="form-control">
        <input
          type="text"
          placeholder="Mahsulot qidirish..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="input input-bordered input-sm w-full"
        />
      </div>

      {/* Sort Dropdown */}
      <div className="form-control">
        <select
          value={sortBy}
          onChange={handleSortChange}
          className="select select-bordered select-sm w-full"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Result count */}
      {resultCount !== undefined && (
        <div className="text-xs text-base-content/60 text-center">
          {resultCount} mahsulot topildi
        </div>
      )}
    </div>
  );
}
