// utils/credentialsDownload.ts

export interface CredentialsPayload {
  storeName: string;
  publicUrl: string;
  adminUrl: string;
  phone: string;
  password: string;
  planName: string;
  months: number;
  expiresAt: string;      // ISO or human-readable
  generatedAt?: string;
}

export const downloadCredentials = (payload: CredentialsPayload): void => {
  const {
    storeName,
    publicUrl,
    adminUrl,
    phone,
    password,
    planName,
    months,
    expiresAt,
    generatedAt,
  } = payload;

  const gen = generatedAt ?? new Date().toLocaleString();

  const text = [
    `========== ${storeName} ==========`,
    ``,
    `Plan: ${planName} (${months} month${months > 1 ? 's' : ''})`,
    `Valid till: ${expiresAt}`,
    ``,
    `--- Login Credentials ---`,
    `Phone:    ${phone}`,
    `Password: ${password}`,
    ``,
    `--- Store URLs ---`,
    `Public Store: ${publicUrl}`,
    `Admin Store:  ${adminUrl}`,
    ``,
    `--- Notes ---`,
    `# Keep these credentials safe.`,
    `# Change your password after first login if you wish.`,
    `# The Admin Store URL is your login page.`,
    `# The Public Store URL is what you share with customers.`,
    ``,
    `Generated: ${gen}`,
    ``,
    `- Smart Admin`,
  ].join('\n');

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(storeName)}-credentials.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'credentials';