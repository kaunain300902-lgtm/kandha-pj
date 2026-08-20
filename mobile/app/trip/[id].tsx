import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, type Job } from '../../src/api';
import { getSocket, onEvent } from '../../src/socket';
import { Button, Card, Label, Row, Stepper } from '../../src/ui';
import { C, R, S, T } from '../../src/theme';

const STAGES = ['Accepted', 'At the pickup', 'In transit', 'At the drop', 'Bilty issued'];

function stageIndex(job: Job): number {
  const s = job.status;
  if (s === 'OPEN') return 0;
  if (s === 'ASSIGNED') return 0;
  if (s === 'REACHED') return 1;
  if (s === 'PICKED') return 2;
  if (s === 'DELIVERED' || s === 'COMPLETED') return job.lrNumber ? 4 : 3;
  return 0;
}

export default function Trip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [lr, setLr] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try { const j = await api.job(id); setJob(j); setLr(j.lrNumber ?? ''); } catch {}
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getSocket()?.emit('job:watch', id);
    const off1 = onEvent('job:step', load);
    const off2 = onEvent('job:accepted', load);
    const off3 = onEvent('count:updated', load);
    return () => { getSocket()?.emit('job:unwatch', id); off1?.(); off2?.(); off3?.(); };
  }, [id, load]);

  if (!job) return <View style={{ flex: 1 }} />;
  const stage = stageIndex(job);
  const unit = job.city.unit;

  return (
    <ScrollView contentContainerStyle={{ padding: S.md, gap: S.md }}>
      <Card>
        <Text style={T.h3}>{job.dropText}</Text>
        <Text style={T.small}>{job.ref} · from {job.pickupText}</Text>
        <Row style={{ marginTop: 12 }}>
          {STAGES.map((label, i) => (
            <View key={label} style={{ flex: i === STAGES.length - 1 ? 0 : 1, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 14, height: 14, borderRadius: 7,
                backgroundColor: i < stage ? C.go : i === stage ? C.brand : C.line }} />
              {i < STAGES.length - 1 && (
                <View style={{ flex: 1, height: 3, backgroundColor: i < stage ? C.go : C.line }} />
              )}
            </View>
          ))}
        </Row>
        <Text style={[T.small, { marginTop: 6, color: C.brand, fontWeight: '800' }]}>{STAGES[stage]}</Text>
      </Card>

      <View>
        <Label>Who is carrying it</Label>
        {(job.assignments ?? []).map((a) => (
          <Card key={a.id} style={{ marginBottom: 8 }}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 15.5, color: C.ink }}>
                  {a.worker.user.name ?? 'Partner'}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.go }}>{a.worker.user.phone}</Text>
                <Text style={T.small}>KND {a.worker.code} · {a.units} {unit}s · ★ {a.worker.ratingAvg || '—'}</Text>
              </View>
              <Button title="Call" kind="go" onPress={() => Linking.openURL(`tel:+${a.worker.user.phone}`)} />
            </Row>
            <Row style={{ marginTop: 10 }}>
              <Text style={[T.small, { flex: 1 }]}>
                He counted {a.countWorker ?? '—'} · you counted {a.countBooker ?? '—'}
              </Text>
              <Button
                kind="ghost" title="Confirm count"
                onPress={async () => {
                  try {
                    const r = await api.bookerCount(job.id, a.id, a.countWorker ?? a.units);
                    Alert.alert(r.matched ? 'Counts match' : 'Counts do not match yet');
                    load();
                  } catch (e: any) { Alert.alert('Could not save', e.message); }
                }}
              />
            </Row>
          </Card>
        ))}
      </View>

      {job.kind === 'BUSINESS' && (
        <View>
          <Label>Bilty / LR number</Label>
          <Card>
            <TextInput value={lr} onChangeText={setLr} placeholder="SBT/2026/44812"
              placeholderTextColor={C.ink3} style={{ fontSize: 16, color: C.ink }} />
          </Card>
          <Button kind="ghost" title="Save LR number" style={{ marginTop: 8 }}
            onPress={async () => { await api.saveLr(job.id, lr); load(); }} />
        </View>
      )}

      <Card>
        <Row>
          <Text style={{ flex: 1, color: C.ink2 }}>Fare</Text>
          <Text style={{ fontWeight: '800', fontSize: 18 }}>₹{job.fareBase + job.fareExtra}</Text>
        </Row>
        <Text style={[T.small, { marginTop: 4 }]}>Paid in cash, directly to the partner.</Text>
      </Card>

      {['OPEN', 'ASSIGNED'].includes(job.status) && (
        <Button kind="danger" title="Cancel this trip"
          onPress={() => Alert.alert('Cancel trip?', 'The partner is told immediately.', [
            { text: 'Keep it', style: 'cancel' },
            { text: 'Cancel trip', style: 'destructive',
              onPress: async () => { await api.cancelJob(job.id, 'Booker cancelled'); load(); } },
          ])} />
      )}
    </ScrollView>
  );
}
