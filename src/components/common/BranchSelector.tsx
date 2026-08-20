import { BRANCHES } from "@/constants/branches";
import type { Branch } from "@/types/branch";

interface BranchSelectorProps {
  value: Branch | "";
  onChange: (value: Branch | "") => void;
  branches?: Branch[];
  placeholder?: string;
  className?: string;
}

export function BranchSelector({
  value,
  onChange,
  branches,
  placeholder = "Chọn cơ sở",
  className = "",
}: BranchSelectorProps) {
  const options = branches ? BRANCHES.filter((b) => branches.includes(b.value)) : BRANCHES;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Branch | "")}
      className={`input ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map((b) => (
        <option key={b.value} value={b.value}>
          {b.label}
        </option>
      ))}
    </select>
  );
}
