export const UNASSIGNED_SHIFT_COLOR = "#c62828";

export const COLOR_OPTIONS = [
  { label: "Blue", value: "#1565c0" },
  { label: "Green", value: "#2e7d32" },
  { label: "Rose", value: "#ad1457" },
  { label: "Purple", value: "#6a1b9a" },
  { label: "Teal", value: "#00838f" },
  { label: "Gold", value: "#9e5f00" },
  { label: "Slate", value: "#455a64" },
  { label: "Brown", value: "#5d4037" },
  { label: "Indigo", value: "#283593" },
];

export function getDefaultPositionColor() {
  return COLOR_OPTIONS[0].value;
}

export function normalizePositionColor(value, fallback = getDefaultPositionColor()) {
  const color = String(value || "").trim().toLowerCase();
  return COLOR_OPTIONS.some((option) => option.value === color) ? color : fallback;
}

function hashPositionKey(value) {
  const key = String(value || "shift");
  let hash = 0;

  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % COLOR_OPTIONS.length;
  }

  return hash;
}

export function getPositionColor(position, fallbackKey = "") {
  const savedColor = normalizePositionColor(position?.color || position?.calendarColor, "");
  if (savedColor) return savedColor;

  const key =
    position?.positionID ??
    position?.ID ??
    position?.id ??
    position?.title ??
    fallbackKey;

  return COLOR_OPTIONS[hashPositionKey(key)].value;
}
