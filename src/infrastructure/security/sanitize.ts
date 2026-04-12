/** Basic XSS mitigation for stored text — prefer strict output encoding in clients. */
export function sanitizeText(input: string, maxLength: number): string {
  const trimmed = input.trim();
  const stripped = trimmed.replace(/[<>]/g, "");
  return stripped.slice(0, maxLength);
}
