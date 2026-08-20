import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { api, type Job } from '../../src/api';
import { useApp } from '../../src/store';
import { t } from '../../src/i18n';
import { say } from '../../src/speak';
import { Button, Card, Row, Stepper } from '../../src/ui';
import { C, R, S, T } from '../../src/theme';

type Running = { id: string; state: string; units: number; job: Job & { booker: { name: string | null; phone: string } } };

const NEXT: Record<string, 'REACHED' | 'PICKED' | 'DELIVERED' | null> = {
  ACCEPTED: 'REACHED', REACHED: 'PICKED', PICKED: 'DELIVERED', DELIVERED: null,
};

export default function RunningJob() {
  const { lang, city } = useApp();
  const [rows, setRows] = useState<Running[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try { const r = await api.running(); setRows(r as Running[]); if (r[0]) setCount(r[0].units); } catch {}
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  /**
   * Location is sent only while a job is running, and the server rejects it
   * otherwise. Tracking a man between jobs is surveillance, not logistics.
   */
  useEffect(() => {
    const active = rows.some((r) => ['ACCEPTED', 'REACHED', 'PICKED'].includes(r.state));
    if (!active) { if (timer.current) clearInterval(timer.current); timer.current = null; return; }
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      timer.current = setInterval(async () => {
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          await api.ping(pos.coords.latitude, pos.coords.longitude);
        } catch {}
      }, 20000);
    })();
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [rows]);

  if (!rows.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.lg }}>
        <Text style={T.body}>{t(lang, 'noWork')}</Text>
      </View>
    );
  }

  const unit = city?.unit ?? 'nag';

  return (
    <ScrollView contentContainerStyle={{ padding: S.md, gap: S.md }}>
      {rows.map((r) => {
        const next = NEXT[r.state];
        const total = r.job.fareBase + r.job.fareExtra;
        const label = next === 'REACHED' ? t(lang, 'reached') : next === 'PICKED' ? t(lang, 'picked')
          : next === 'DELIVERED' ? t(lang, 'dropped') : t(lang, 'done');
        return (
          <Card key={r.id}>
            <Text style={T.h3}>{r.job.pickupText}</Text>
            <Text style={T.small}>{r.job.ref} → {r.job.dropText}</Text>

            <Row gap={8} style={{ marginTop: 12 }}>
              {[{ v: String(r.units), l: unit }, { v: String(r.job.kgPerUnit), l: 'kg' }, { v: `₹${total}`, l: '' }].map((b, i) => (
                <View key={i} style={{ flex: 1, backgroundColor: C.bg, borderRadius: R.md, padding: 10, alignItems: 'center' }}>
                  <Text style={T.bigNum}>{b.v}</Text>
                  {!!b.l && <Text style={T.small}>{b.l}</Text>}
                </View>
              ))}
            </Row>

            <Button
              kind="ghost" style={{ marginTop: 12 }}
              title={`📞  ${t(lang, 'callShop')} · ${r.job.booker.phone}`}
              onPress={() => Linking.openURL(`tel:+${r.job.booker.phone}`)}
            />

            {r.state === 'REACHED' && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 8 }}>{t(lang, 'confirmCount')}</Text>
                <Stepper value={count ?? r.units} onChange={setCount} min={0} />
              </View>
            )}

            {next && (
              <Button
                kind="go" big style={{ marginTop: 12 }} title={label}
                onPress={async () => {
                  try {
                    await api.step(r.job.id, next, next === 'PICKED' ? (count ?? r.units) : undefined);
                    say(label, lang);
                    load();
                  } catch (e: any) { Alert.alert('Could not update', e.message); }
                }}
              />
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}
