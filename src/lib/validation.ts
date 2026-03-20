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

/**
 * Strips country code prefix (+55 or leading 55) to get local digits (DDD + number).
 * Handles inputs like: +5511999999999, 5511999999999, 11999999999, (11) 99999-9999
 */
function stripToLocal(value: string): string {
  let d = value.replace(/\D/g, "");
  // Strip leading 55 only if result would still have 10-11 digits (DDD + number)
  if (d.length >= 12 && d.startsWith("55")) {
    d = d.slice(2);
  }
  return d.slice(0, 11);
}

/**
 * Applies visual mask: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
 */
export function formatPhoneBR(value: string): string {
  const d = stripToLocal(value);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Normalizes to storage format: 55 + DDD + number (e.g. 5545999999999)
 */
export function normalizePhone(value: string): string {
  const local = stripToLocal(value);
  if (local.length < 10) return local; // too short, return as-is
  return "55" + local;
}

/**
 * Returns WhatsApp-compatible number for wa.me link (just digits with country code)
 */
export function phoneToWhatsApp(stored: string): string {
  const d = stored.replace(/\D/g, "");
  // Already has 55 prefix
  if (d.startsWith("55") && d.length >= 12) return d;
  // Local number, add 55
  if (d.length >= 10 && d.length <= 11) return "55" + d;
  return d;
}

export function validatePhone(phone: string): string | null {
  const local = stripToLocal(phone);
  if (!local) return "Digite um telefone válido com DDD";
  if (local.length !== 10 && local.length !== 11) {
    return "Digite um telefone válido com DDD (10 ou 11 dígitos)";
  }
  const ddd = parseInt(local.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return "DDD inválido";
  // Mobile numbers (11 digits) must start with 9 after DDD
  if (local.length === 11 && local[2] !== "9") {
    return "Celular deve começar com 9 após o DDD";
  }
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
