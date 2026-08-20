export const C = {
  brand: '#0041F5',
  brandDark: '#0033C4',
  brandSoft: '#E9EFFF',
  ink: '#0B0B0F',
  ink2: '#4A4F5C',
  ink3: '#868C96',
  line: '#E6E8EC',
  bg: '#F5F6F8',
  paper: '#FFFFFF',
  go: '#00A15C',
  goSoft: '#E6F6EF',
  warn: '#FF8A00',
  warnSoft: '#FFF3E3',
  stop: '#E5342A',
  stopSoft: '#FDECEB',
};

export const R = { sm: 10, md: 12, lg: 16, xl: 20 };
export const S = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24 };

/**
 * Type scale is deliberately large. Every number a worker needs — money,
 * counts, minutes — is displayed at 22px or above, because numerals are the
 * one thing non-literate users read reliably.
 */
export const T = {
  h1: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.5, color: C.ink },
  h2: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.3, color: C.ink },
  h3: { fontSize: 17, fontWeight: '700' as const, color: C.ink },
  body: { fontSize: 15, color: C.ink2, lineHeight: 21 },
  small: { fontSize: 13, color: C.ink3 },
  label: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 1, color: C.ink3 },
  money: { fontSize: 30, fontWeight: '800' as const, color: C.ink },
  bigNum: { fontSize: 23, fontWeight: '800' as const, color: C.ink },
};
