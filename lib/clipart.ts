export type ClipartItem = {
  id: string;
  label: string;
  category: string;
  svg: string;
};

export const CLIPART_CATEGORIES = ["Sports", "Animals", "Shapes", "Work", "Holiday"] as const;

export const CLIPART: ClipartItem[] = [
  {
    id: "star",
    label: "Star",
    category: "Shapes",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><polygon fill="currentColor" points="32 4 40 22 60 24 44 38 48 58 32 48 16 58 20 38 4 24 24 22"/></svg>`,
  },
  {
    id: "heart",
    label: "Heart",
    category: "Shapes",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M32 56S6 40 6 22a14 14 0 0 1 26-7 14 14 0 0 1 26 7c0 18-26 34-26 34z"/></svg>`,
  },
  {
    id: "bolt",
    label: "Bolt",
    category: "Shapes",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M36 4 12 36h16l-4 24 28-36H36z"/></svg>`,
  },
  {
    id: "flame",
    label: "Flame",
    category: "Shapes",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M32 4s18 16 18 32a18 18 0 1 1-36 0c0-8 8-16 12-20-2 8 6 10 6 10S26 14 32 4z"/></svg>`,
  },
  {
    id: "paw",
    label: "Paw",
    category: "Animals",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="20" r="7" fill="currentColor"/><circle cx="32" cy="12" r="7" fill="currentColor"/><circle cx="46" cy="20" r="7" fill="currentColor"/><ellipse cx="32" cy="42" rx="16" ry="14" fill="currentColor"/></svg>`,
  },
  {
    id: "ball",
    label: "Ball",
    category: "Sports",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="4"/><path d="M12 24h40M12 40h40M24 12v40M40 12v40" fill="none" stroke="currentColor" stroke-width="3"/></svg>`,
  },
  {
    id: "crown",
    label: "Crown",
    category: "Shapes",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M8 48 16 20l16 14 16-14 8 28H8zm0 4h48v6H8z"/></svg>`,
  },
  {
    id: "music",
    label: "Music",
    category: "Holiday",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M48 8v32a10 10 0 1 1-6-9V18L22 22v26a10 10 0 1 1-6-9V14z"/></svg>`,
  },
  {
    id: "leaf",
    label: "Leaf",
    category: "Holiday",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M54 10C28 10 10 32 10 54c22-4 40-22 44-44z"/><path d="M22 42 48 16" fill="none" stroke="#fff" stroke-width="3"/></svg>`,
  },
  {
    id: "shield",
    label: "Shield",
    category: "Sports",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M32 6 54 14v18c0 16-10 26-22 32C20 58 10 48 10 32V14z"/></svg>`,
  },
  {
    id: "anchor",
    label: "Anchor",
    category: "Shapes",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="12" r="6" fill="currentColor"/><path fill="currentColor" d="M29 16h6v32c-12 0-20-8-20-8l4-4s5 6 16 6 16-6 16-6l4 4s-8 8-20 8z"/></svg>`,
  },
  {
    id: "smile",
    label: "Smile",
    category: "Shapes",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="24" cy="26" r="3" fill="currentColor"/><circle cx="40" cy="26" r="3" fill="currentColor"/><path d="M20 38c4 8 20 8 24 0" fill="none" stroke="currentColor" stroke-width="3"/></svg>`,
  },
  {
    id: "trophy",
    label: "Trophy",
    category: "Sports",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M16 12h32v10a16 16 0 0 1-32 0V12zm-6 2h6v8c-4 0-6-4-6-8zm38 0h6c0 4-2 8-6 8V14zM24 42h16l-2 8H26zm-4 10h24v4H20z"/></svg>`,
  },
  {
    id: "whistle",
    label: "Whistle",
    category: "Sports",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M8 28h28a14 14 0 1 1 0 8H20l-4 10H8V28zm36 4a6 6 0 1 0 0 8 6 6 0 0 0 0-8z"/></svg>`,
  },
  {
    id: "eagle",
    label: "Eagle",
    category: "Animals",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M32 10c6 0 10 6 8 12l14 8-8 4-8-2-2 14h-8l-2-14-8 2-8-4 14-8c-2-6 2-12 8-12z"/></svg>`,
  },
  {
    id: "dog",
    label: "Dog",
    category: "Animals",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 22 8 8l12 8h24l12-8-4 14v20H12zm8 24h8v10H20zm16 0h8v10h-8z"/></svg>`,
  },
  {
    id: "fish",
    label: "Fish",
    category: "Animals",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M8 32c18-16 30-12 40-8l8-10v36l-8-10C38 44 26 48 8 32zm28-6a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>`,
  },
  {
    id: "hardhat",
    label: "Hard hat",
    category: "Work",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M10 36c0-14 10-22 22-22s22 8 22 22H10zm-4 4h52v6H6z"/></svg>`,
  },
  {
    id: "wrench",
    label: "Wrench",
    category: "Work",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M44 8a14 14 0 0 0-12 22L8 54l10 2 24-24A14 14 0 0 0 44 8zm0 8a6 6 0 1 1 0 12 6 6 0 0 1 0-12z"/></svg>`,
  },
  {
    id: "gear",
    label: "Gear",
    category: "Work",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M28 6h8l2 8 8-3 4 8-6 6 6 6-4 8-8-3-2 8h-8l-2-8-8 3-4-8 6-6-6-6 4-8 8 3zm4 16a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/></svg>`,
  },
  {
    id: "tree",
    label: "Tree",
    category: "Holiday",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M32 6 12 28h8L10 42h10L8 56h48L44 42h10L44 28h8zM28 56h8v6h-8z"/></svg>`,
  },
  {
    id: "snowflake",
    label: "Snowflake",
    category: "Holiday",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M30 6h4v52h-4zM6 30h52v4H6zm8-16 4-4 32 32-4 4zm32-4 4 4-32 32-4-4z"/></svg>`,
  },
  {
    id: "circle",
    label: "Circle",
    category: "Shapes",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="22" fill="currentColor"/></svg>`,
  },
  {
    id: "banner",
    label: "Banner",
    category: "Shapes",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M6 18h52l-8 14 8 14H6l8-14z"/></svg>`,
  },
];

export const STUDIO_FONTS = [
  "Anton",
  "Oswald",
  "Bebas Neue",
  "Pacifico",
  "Permanent Marker",
  "Playfair Display",
  "Righteous",
  "Lobster",
  "Inter",
  "Georgia",
];

export const PRINT_COLORS = [
  "#111111",
  "#ffffff",
  "#c41e3a",
  "#0b1f6a",
  "#0446d4",
  "#0f7a3a",
  "#f0b429",
  "#e85d04",
  "#d946ef",
  "#6b7280",
  "#7c2d12",
  "#0891b2",
];
