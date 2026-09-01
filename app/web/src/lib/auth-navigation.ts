export function loginPathFor(returnTo: string): string {
  const safe = safeReturnTo(returnTo);
  return `/dang-nhap?returnTo=${encodeURIComponent(safe)}`;
}

export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function isAuthenticationFailure(status: number, code?: string): boolean {
  return status === 401 || code === "UNAUTHENTICATED" || code === "AUTH_NOT_CONFIGURED";
}

