export const num = (v: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v)
export const compact = (v: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
export const money = (v: number) => num(v)
export const pct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
