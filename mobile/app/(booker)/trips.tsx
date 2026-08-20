import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api, type Job } from '../../src/api';
import { onEvent } from '../../src/socket';
import { Card, Row } from '../../src/ui';
import { C, S, T } from '../../src/theme';

const LIVE = ['OPEN', 'ASSIGNED', 'REACHED', 'PICKED'];

export default function Trips() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try { setJobs(await api.myJobs()); } catch {}
    finally { setBusy(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => onEvent('job:step', load), [load]);
  useEffect(() => onEvent('job:accepted', load), [load]);

  return (
    <FlatList
      data={jobs}
      keyExtractor={(j) => j.id}
      contentContainerStyle={{ padding: S.md, gap: S.sm }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.brand} />}
      ListEmptyComponent={
        <Text style={[T.body, { textAlign: 'center', marginTop: 40 }]}>
          Nothing booked yet. Your trips will show here.
        </Text>
      }
      renderItem={({ item }) => {
        const live = LIVE.includes(item.status);
        const taken = item.assignments?.length ?? 0;
        return (
          <Pressable onPress={() => router.push(`/trip/${item.id}`)}>
            <Card>
              <Row>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', fontSize: 15.5, color: C.ink }} numberOfLines={1}>
                    {item.dropText}
                  </Text>
                  <Text style={T.small} numberOfLines={1}>
                    {item.ref} · from {item.pickupText}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={T.bigNum}>{item.units}</Text>
                  <Text style={T.small}>{item.city.unit}s</Text>
                </View>
              </Row>
              <Row style={{ marginTop: 10 }}>
                <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7,
                  backgroundColor: live ? C.warnSoft : C.goSoft }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: live ? '#8A4B00' : C.go }}>
                    {live ? 'Moving' : item.status}
                  </Text>
                </View>
                <Text style={[T.small, { flex: 1 }]}>
                  {taken}/{item.helpers} partners · ₹{item.fareBase + item.fareExtra}
                </Text>
              </Row>
            </Card>
          </Pressable>
        );
      }}
    />
  );
}
