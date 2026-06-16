"use client"

// Re-export from progress-bar.tsx for backward compatibility.
// Some legacy module references (and Turbopack HMR cache entries) still
// import from "@/components/ui/progress" — this file satisfies those
// references without duplicating the component.
export { Progress } from "@/components/ui/progress-bar"
