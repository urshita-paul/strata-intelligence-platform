export function observationDisplay(value: number, loading: boolean, error: string): string | null {
  if (loading) return null;
  if (error) return "Unavailable";
  return value.toLocaleString("en-IN");
}