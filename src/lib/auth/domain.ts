export interface GoogleProfileInput {
  email?: string | null;
  emailVerified: boolean;
  hostedDomain?: string | null;
  allowedDomain: string;
}

export function isAllowedGoogleProfile({
  email,
  emailVerified,
  hostedDomain,
  allowedDomain
}: GoogleProfileInput): boolean {
  if (!email || !emailVerified) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const domain = allowedDomain.trim().toLowerCase();
  if (!domain || !normalizedEmail.endsWith(`@${domain}`)) return false;
  return !hostedDomain || hostedDomain.trim().toLowerCase() === domain;
}
