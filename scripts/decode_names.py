"""Decode garbled Vietnamese text from Excel dump using proper encoding."""
import re, io

with open("analysis/excel_dump.txt", "rb") as f:
    raw = f.read()

# The Python script originally wrote UTF-8 bytes but PowerShell cp1252
# couldn't display them. So the file contains the UTF-8 bytes directly.
# Re-decode the whole file as UTF-8
try:
    text = raw.decode("utf-8", errors="replace")
    print(f"Decoded as utf-8, {len(text)} chars")
except Exception as e:
    print(f"UTF-8 failed: {e}")
    text = ""

# Extract B-column entries (employee names)
# Pattern: B<row> (col=2) : '<value>'
pattern = re.compile(r"B(\d+).*?: '([^']+)'")
matches = pattern.findall(text)

for row, name in sorted(matches, key=lambda x: int(x[0])):
    row_n = int(row)
    if 5 <= row_n <= 50:
        print(f"  Row {row}: {name}")

# Also try to find the actual B column content directly
print("\n--- Direct B-column scan ---")
lines = text.split("\n")
for line in lines:
    # Look for pattern like "  B5 (row=5, col=2): 'something'"
    m = re.match(r"\s*B(\d+).*?: '(.+)'", line)
    if m and 5 <= int(m.group(1)) <= 50:
        print(f"  B{m.group(1)}: {m.group(2)}")
