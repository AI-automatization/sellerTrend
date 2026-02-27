# Uzum Trend Finder — Design System Rules (Figma MCP)

## Stack
- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + DaisyUI v5
- **Build:** Vite 7 + @tailwindcss/vite plugin
- **Charts:** Recharts 2.15
- **Router:** react-router-dom 7
- **HTTP:** Axios

## Theme
- Default theme: `night` (dark) — `data-theme="night"`
- Available: `light`, `dark`, `night`
- All colors use DaisyUI semantic tokens, NOT raw hex

## Color Tokens (DaisyUI semantic)
```
primary          → Main brand color (buttons, links, active states)
primary-content  → Text on primary background
secondary        → Secondary actions
accent           → Accent highlights
neutral          → Neutral elements
base-100         → Page background
base-200         → Card/section background
base-300         → Borders, dividers
base-content     → Default text color
success          → Positive states (green)
warning          → Caution states (amber)
error            → Error states (red)
info             → Informational (blue)
```

### Opacity pattern for secondary text:
```
text-base-content/50   → Secondary text
text-base-content/30   → Tertiary/muted text
bg-primary/10          → Light primary background
bg-error/10            → Light error background
border-primary/20      → Subtle primary border
```

## Typography
| Role | Class |
|------|-------|
| Page title | `text-2xl font-bold` |
| Section title | `text-lg font-semibold` |
| Card title | `card-title text-sm text-base-content/70` |
| Body | `text-sm` or `text-base` |
| Label | `text-xs` |
| Stat value | `stat-value text-xl` |
| Stat label | `stat-title text-xs` |

## Component Patterns

### Button
```tsx
<button className="btn btn-primary">Primary</button>
<button className="btn btn-outline">Outline</button>
<button className="btn btn-ghost">Ghost</button>
<button className="btn btn-sm">Small</button>
<button className="btn btn-lg">Large</button>
<button className="btn gap-2"><Icon /> With icon</button>
```

### Card
```tsx
<div className="card bg-base-200 shadow-sm">
  <div className="card-body">
    <h2 className="card-title">Title</h2>
    {/* content */}
    <div className="card-actions justify-end">
      <button className="btn btn-primary">Action</button>
    </div>
  </div>
</div>
```

### Stat Card
```tsx
<div className="stat bg-base-200 rounded-2xl">
  <div className="stat-figure text-primary">
    <IconComponent className="w-8 h-8" />
  </div>
  <div className="stat-title text-xs">Label</div>
  <div className="stat-value text-xl">123</div>
  <div className="stat-desc">Description</div>
</div>
```

### Badge
```tsx
<span className="badge badge-success badge-sm">Active</span>
<span className="badge badge-warning badge-sm">Pending</span>
<span className="badge badge-error badge-sm">Error</span>
<span className="badge badge-ghost badge-sm">Default</span>
```

### Form Input
```tsx
<fieldset className="fieldset">
  <legend className="fieldset-legend text-xs">Label</legend>
  <input type="text" className="input input-bordered w-full" />
  <p className="fieldset-label">Helper text</p>
</fieldset>
```

### Alert
```tsx
<div role="alert" className="alert alert-error">
  <span>Error message</span>
</div>
```

### Table
```tsx
<div className="overflow-x-auto">
  <table className="table table-zebra table-sm">
    <thead><tr><th>Col</th></tr></thead>
    <tbody><tr><td>Data</td></tr></tbody>
  </table>
</div>
```

### Tabs
```tsx
<div className="tabs tabs-bordered">
  <button className="tab tab-active">Tab 1</button>
  <button className="tab">Tab 2</button>
</div>
```

### Loading
```tsx
<span className="loading loading-spinner loading-lg" />
<span className="loading loading-dots loading-sm" />
```

## Layout
- Drawer sidebar: `drawer lg:drawer-open`
- Mobile: hamburger toggle, sidebar slides in as overlay
- Desktop: sidebar always visible (lg:drawer-open)
- Content area: `drawer-content` with navbar on top
- Max width: `max-w-6xl mx-auto` for page content

## Responsive Grid
```tsx
// Stats row
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

// Cards grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// Flex row → stack on mobile
<div className="flex flex-col sm:flex-row sm:items-center gap-3">
```

## Icons
- Custom SVG components in `apps/web/src/components/icons.tsx`
- Style: Heroicons outline (stroke-based, `fill="none"`, `stroke="currentColor"`)
- Size: `className="w-5 h-5"` (nav), `className="w-8 h-8"` (stat figures)
- Available: ChartBarIcon, MagnifyingGlassIcon, FireIcon, WalletIcon, GlobeAltIcon, ArrowTrendingUpIcon, ArrowRightOnRectangleIcon

## Key Rules for Figma → Code
1. ALWAYS use DaisyUI component classes (btn, card, stat, badge, table, etc.)
2. NEVER use raw hex colors — map to semantic tokens (primary, success, error, etc.)
3. Use `bg-base-200` for cards, `bg-base-100` for page background
4. Use `/opacity` suffix for muted text: `text-base-content/50`
5. Rounded corners: DaisyUI defaults (btn = rounded-btn, card = rounded-box)
6. Spacing: Tailwind scale (gap-2, gap-3, gap-4, p-4, p-6)
7. Dark theme assumed — design for `night` theme
8. Mobile-first responsive: base → sm: → lg:
9. Language: Uzbek (UI labels in Uzbek, code in English)
10. No external icon packages — use custom SVG components from icons.tsx
