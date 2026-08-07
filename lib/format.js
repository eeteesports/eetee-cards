export function formatPrice(n) {
  if (n == null || isNaN(n)) return null
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
