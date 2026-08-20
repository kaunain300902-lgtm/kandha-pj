import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { C, R, S, T } from './theme';

export function Button({
  title, onPress, kind = 'primary', big, loading, disabled, style, left,
}: {
  title: string; onPress?: () => void;
  kind?: 'primary' | 'ghost' | 'go' | 'danger';
  big?: boolean; loading?: boolean; disabled?: boolean; style?: ViewStyle; left?: React.ReactNode;
}) {
  const bg = kind === 'primary' ? C.brand : kind === 'go' ? C.go : kind === 'danger' ? C.stopSoft : C.paper;
  const fg = kind === 'ghost' ? C.ink : kind === 'danger' ? C.stop : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
          height: big ? 60 : 50,
          borderWidth: kind === 'ghost' ? 1.5 : 0, borderColor: C.line },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {left}
          <Text style={{ color: fg, fontWeight: '800', fontSize: big ? 18 : 16 }}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[s.card, style]}>{children}</View>
);

export const Label = ({ children }: { children: React.ReactNode }) => (
  <Text style={[T.label, { textTransform: 'uppercase', marginBottom: 8 }]}>{children}</Text>
);

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && { backgroundColor: C.brandSoft, borderColor: C.brand }]}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: on ? C.brand : C.ink2 }}>{label}</Text>
    </Pressable>
  );
}

export function Stepper({ value, onChange, step = 1, min = 1 }: {
  value: number; onChange: (v: number) => void; step?: number; min?: number;
}) {
  return (
    <View style={s.stepper}>
      <Pressable onPress={() => onChange(Math.max(min, value - step))} style={s.stepBtn}>
        <Text style={s.stepSign}>−</Text>
      </Pressable>
      <Text style={[T.money, { flex: 1, textAlign: 'center' }]}>{value}</Text>
      <Pressable onPress={() => onChange(value + step)} style={s.stepBtn}>
        <Text style={s.stepSign}>+</Text>
      </Pressable>
    </View>
  );
}

/** Pickup → drop, the way every Indian logistics app draws it. */
export function LocStack({ pickup, pickupSub, drop, onPickup, onDrop }: {
  pickup: string; pickupSub?: string; drop: string; onPickup?: () => void; onDrop?: () => void;
}) {
  return (
    <View style={s.loc}>
      <Pressable onPress={onPickup} style={s.locRow}>
        <View style={[s.marker, { backgroundColor: C.go, borderRadius: 6 }]} />
        <View style={{ flex: 1 }}>
          <Text style={T.label}>PICKUP</Text>
          <Text style={s.locVal} numberOfLines={2}>{pickup}</Text>
          {!!pickupSub && <Text style={T.small} numberOfLines={1}>{pickupSub}</Text>}
        </View>
        {!!onPickup && <Text style={s.change}>Change</Text>}
      </Pressable>
      <View style={s.locDivider} />
      <Pressable onPress={onDrop} style={s.locRow}>
        <View style={[s.marker, { backgroundColor: C.stop, borderRadius: 2 }]} />
        <View style={{ flex: 1 }}>
          <Text style={T.label}>DROP</Text>
          <Text style={s.locVal} numberOfLines={2}>{drop}</Text>
        </View>
        {!!onDrop && <Text style={s.change}>Change</Text>}
      </Pressable>
    </View>
  );
}

export const Money = ({ value, sub }: { value: number; sub?: string }) => (
  <View>
    <Text style={T.money}>₹{value.toLocaleString('en-IN')}</Text>
    {!!sub && <Text style={T.small}>{sub}</Text>}
  </View>
);

export const Row = ({ children, gap = 10, style }: { children: React.ReactNode; gap?: number; style?: ViewStyle }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>
);

const s = StyleSheet.create({
  btn: { borderRadius: R.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.md },
  card: { backgroundColor: C.paper, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: S.md },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: R.sm, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.paper },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderRadius: R.md, borderWidth: 1.5, borderColor: C.line, padding: 6 },
  stepBtn: { width: 52, height: 52, borderRadius: R.sm, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 26, fontWeight: '800', color: C.ink2 },
  loc: { backgroundColor: C.paper, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.line, overflow: 'hidden' },
  locRow: { flexDirection: 'row', gap: 12, padding: S.md, alignItems: 'flex-start' },
  locDivider: { height: 1, backgroundColor: C.line, marginLeft: 40 },
  marker: { width: 12, height: 12, marginTop: 6 },
  locVal: { fontSize: 15.5, fontWeight: '700', color: C.ink, marginTop: 2 },
  change: { fontSize: 13, fontWeight: '800', color: C.brand, alignSelf: 'center' },
});
