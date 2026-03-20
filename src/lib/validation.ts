// ── Name Validation ──────────────────────────────

const BLOCKED_NAMES = ["teste", "test", "cliente", "admin", "usuario", "user", "nome", "example", "exemplo"];

export function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function validateName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Digite nome e sobrenome válidos";

  if (/[^a-zA-ZÀ-ÿ\s'-]/.test(trimmed)) {
    return "Nome não pode conter números ou caracteres especiais";
  }

  const words = trimmed.split(" ").filter((w) => w.length >= 2);
  if (words.length < 2) return "Digite nome e sobrenome válidos";

  if (BLOCKED_NAMES.includes(words[0].toLowerCase())) {
    return "Digite um nome real válido";
  }

  return null;
}

// ── Email Validation ─────────────────────────────

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Digite um e-mail válido";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(trimmed)) return "Digite um e-mail válido";
  return null;
}

// ── Phone Validation (Brazil) ────────────────────

export function formatPhoneBR(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "Digite um telefone válido com DDD";
  if (digits.length < 10 || digits.length > 11) {
    return "Digite um telefone válido com DDD";
  }
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return "DDD inválido";
  return null;
}

/**
 * Validates phone only if non-empty. Returns null if empty (optional field).
 */
export function validatePhoneOptional(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return validatePhone(phone);
}
