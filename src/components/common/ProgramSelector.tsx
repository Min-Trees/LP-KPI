import { ALL_PROGRAMS } from "@/constants/programs";
import type { Program } from "@/constants/programs";

interface ProgramSelectorProps {
  value: Program | "";
  onChange: (value: Program | "") => void;
  placeholder?: string;
  className?: string;
}

export function ProgramSelector({
  value,
  onChange,
  placeholder = "Chọn chương trình",
  className = "",
}: ProgramSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Program | "")}
      className={`input ${className}`}
    >
      <option value="">{placeholder}</option>
      {ALL_PROGRAMS.map((p) => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </select>
  );
}
