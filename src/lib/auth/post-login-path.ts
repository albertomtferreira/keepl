export function postLoginPath(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    [...value].some((char) => char.charCodeAt(0) <= 32 || char === "\\")
  )
    return "/home";
  try {
    const url = new URL(value, "https://keepl.invalid");
    if (url.origin !== "https://keepl.invalid" || url.pathname === "/login")
      return "/home";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/home";
  }
}
