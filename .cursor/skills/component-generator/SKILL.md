---
name: component-generator
description: Generate React components following Map Safety Notifier project conventions. Use when the user asks to create a new component, page, or feature UI element.
---

# Component Generator

## Component Template

```tsx
import { cn } from "@/lib/utils";

interface [Name]Props {
  className?: string;
}

export function [Name]({ className }: [Name]Props) {
  return (
    <div className={cn("", className)}>
      {/* content */}
    </div>
  );
}
```

## Page Template

```tsx
import { NavBar } from "@/components/NavBar";

export function [Name]Page() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        {/* content */}
      </main>
    </div>
  );
}
```

## Checklist

Before generating a component:

1. **Location**: Feature component → `src/components/`, page → `src/pages/`
2. **Props**: Define interface with `[Name]Props`
3. **Styling**: Tailwind only, accept `className` prop, use `cn()`
4. **Data**: Use existing hooks or create new one in `src/hooks/`
5. **UI primitives**: Import from `@/components/ui/` (shadcn)
6. **Icons**: Use Lucide React (`import { Icon } from "lucide-react"`)
7. **Text**: All user-facing text in Brazilian Portuguese
8. **Route**: If page, add route in `src/App.tsx`

## Common Imports

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, MapPin, AlertTriangle } from "lucide-react";
```

## Pin Type Colors

```tsx
const pinTypeConfig = {
  flood: { label: "Alagamento", color: "bg-flood/20 text-flood" },
  pothole: { label: "Buraco", color: "bg-pothole/20 text-pothole" },
  passable: { label: "Transitável", color: "bg-passable/20 text-passable" },
  robbery: { label: "Assalto", color: "bg-robbery/20 text-robbery" },
} as const;
```
