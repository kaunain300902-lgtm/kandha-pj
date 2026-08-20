const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I — read aloud over a phone

export function shortRef(prefix = 'K'): string {
  let out = '';
  for (let i = 0; i < 5; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${prefix}-${out}`;
}

/** Worker card number: five digits, spoken as digits in every language. */
export function workerCode(): string {
  return String(Math.floor(10000 + Math.random() * 89999));
}
