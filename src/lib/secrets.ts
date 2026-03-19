import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

// Derive a 32-byte key from the secret string
function deriveKey(): Buffer {
  const secret = process.env.SECRETS_ENCRYPTION_KEY || process.env.CLERK_SECRET_KEY || "fallback-dev-key";
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptSecret(ciphertext: string): string {
  const key = deriveKey();
  const [ivHex, encrypted] = ciphertext.split(":");
  if (!ivHex || !encrypted) throw new Error("Invalid ciphertext format");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Replace $GLORB_SECRET_<name> placeholders in a string with resolved values.
 */
export function resolveSecrets(
  text: string,
  secrets: Record<string, string>
): string {
  return text.replace(/\$GLORB_SECRET_(\w+)/g, (match, name) => {
    return secrets[name] ?? match;
  });
}
