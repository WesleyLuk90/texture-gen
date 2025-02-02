export function checkNotNull<T>(value: T | null | undefined): NonNullable<T> {
  if (value == null) {
    throw new Error("Value was null");
  }
  return value;
}
