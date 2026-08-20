import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api, type Job } from '../../src/api';
import { onEvent } from '../../src/socket';
import { useApp } from '../../src/store';
import { jobSentence, t } from '../../src/i18n';
import { say } from '../../src/speak';
import { Button, Card, Chip, Row } from '../../src/ui';
import { C, R, S, T } from '../../src/theme';

/**
 * The app opens here — on the work, not on a sign-up screen. Every open job he
 * can take, with three ways into the same information: big numerals, a full
 * sentence in his language, and a speaker that reads that sentence aloud.
 */
export default function Board() {
  const { lang, me, city, refresh } = useApp();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scope, setScope] = useState<'mine' | 'nearby' | 'all'>('nearby');
  const [sort, setSort] = useState<'near' | 'pay'>('near');
  const [duty, setDuty] = useState(me?.worker?.onDuty ?? false);
  const [busy, setBusy] = useState(false);

  const verified = me?.worker?.verify === 'VERIFIED';
  const unit = city?.unit ?? 'nag';

  const load = useCallback(async () => {
    if (!verified) return;
    setBusy(true);
    try { setJobs(await api.board(scope, sort)); } catch {}
    finally { setBusy(false); }
  }, [scope, sort, verified]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => onEvent('job:new', load), [load]);
  useEffect(() => onEvent('job:taken', load), [load]);

  const toggleDuty = async () => {
    try {
      const r = await api.setDuty(!duty);
      setDuty(r.onDuty);
      say(r.onDuty ? t(lang, 'dutyOn') : t(lang, 'dutyOff'), lang);
      await refresh();
    } catch (e: any) { Alert.alert('Could not change', e.message); }
  };

  const accept = async (job: Job) => {
    try {
      await api.accept(job.id);
      say(t(lang, 'yes'), lang);
      router.push('/(worker)/running');
    } catch (e: any) { Alert.alert('Could not take this job', e.message); }
  };

  if (!verified) {
    return (
      <View style={{ flex: 1, padding: S.lg, gap: S.md, justifyContent: 'center' }}>
        <Text style={T.h2}>{t(lang, 'verifyTitle')}</Text>
        <Text style={T.body}>{t(lang, 'verifyBody')}</Text>
        <Button kind="go" big title={t(lang, 'callHelp')} onPress={() => {}} />
      </View>
    );
  }

  return (
    <FlatList
      data={jobs}
      keyExtractor={(j) => j.id}
      contentContainerStyle={{ padding: S.md, gap: S.sm, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={C.brand} />}
      ListHeaderComponent={
        <View style={{ gap: S.sm, marginBottom: S.sm }}>
          <Pressable onPress={toggleDuty}>
            <View style={{ borderRadius: R.lg, padding: S.md, flexDirection: 'row', alignItems: 'center',
              gap: 14, backgroundColor: duty ? C.go : '#2A2E38' }}>
              <View style={{ width: 58, height: 34, borderRadius: 17, padding: 4,
                backgroundColor: 'rgba(255,255,255,0.25)', alignItems: duty ? 'flex-end' : 'flex-start' }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff' }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>
                  {duty ? t(lang, 'dutyOn') : t(lang, 'dutyOff')}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                  {duty ? t(lang, 'dutyOnSub') : t(lang, 'dutyOffSub')}
                </Text>
              </View>
            </View>
          </Pressable>

          <Row gap={8}>
            {(['mine', 'nearby', 'all'] as const).map((s) => (
              <Chip key={s} label={t(lang, s === 'mine' ? 'mine' : s === 'nearby' ? 'nearby' : 'all')}
                on={scope === s} onPress={() => setScope(s)} />
            ))}
          </Row>
          <Row gap={8}>
            {(['near', 'pay'] as const).map((s) => (
              <Chip key={s} label={t(lang, s === 'near' ? 'nearest' : 'bestPay')}
                on={sort === s} onPress={() => setSort(s)} />
            ))}
          </Row>

          <Button
            kind="ghost"
            title={`🔊  ${t(lang, 'readAll')}`}
            onPress={() => say(
              jobs.length
                ? jobs.map((j) => jobSentence(lang, { ...j, unitWord: unit })).join(' … ')
                : t(lang, 'noWork'),
              lang,
            )}
          />
          <Text style={T.small}>
            {jobs.length} {t(lang, 'openJobs')}
          </Text>
        </View>
      }
      ListEmptyComponent={<Text style={[T.body, { textAlign: 'center', marginTop: 30 }]}>{t(lang, 'noWork')}</Text>}
      renderItem={({ item }) => {
        const total = item.fareBase + item.fareExtra;
        return (
          <Card style={{ borderColor: item.fareExtra ? C.brand : C.line, borderWidth: item.fareExtra ? 2 : 1 }}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 16.5, color: C.ink }} numberOfLines={2}>
                  {item.pickupText}
                </Text>
                <Text style={T.small} numberOfLines={1}>{item.market.name} → {item.dropText}</Text>
              </View>
              <Button
                kind="primary" title="🔊"
                onPress={() => say(jobSentence(lang, { ...item, unitWord: unit }), lang)}
                style={{ width: 54 }}
              />
            </Row>

            <Row gap={8} style={{ marginTop: 12 }}>
              {[
                { v: String(item.units), l: unit },
                { v: String(item.kgPerUnit), l: 'kg' },
                { v: `₹${total}`, l: t(lang, item.fareExtra ? 'total' : 'yes') },
              ].map((b) => (
                <View key={b.l} style={{ flex: 1, backgroundColor: C.bg, borderRadius: R.md, padding: 10, alignItems: 'center' }}>
                  <Text style={T.bigNum}>{b.v}</Text>
                  <Text style={T.small}>{b.l}</Text>
                </View>
              ))}
            </Row>

            {item.fareExtra > 0 && (
              <View style={{ backgroundColor: C.go, borderRadius: R.md, padding: 10, marginTop: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  {t(lang, 'extra')} ₹{item.fareExtra} · ₹{item.fareBase} + ₹{item.fareExtra}
                </Text>
              </View>
            )}

            <View style={{ backgroundColor: C.bg, borderRadius: R.md, padding: 10, marginTop: 10 }}>
              <Text style={{ fontSize: 14, color: C.ink2, lineHeight: 20 }}>
                {jobSentence(lang, { ...item, unitWord: unit })}
              </Text>
            </View>

            <Text style={[T.small, { marginTop: 8 }]}>
              {(item.helpers - (item.placesLeft ?? 0))}/{item.helpers} {t(lang, 'places')}
            </Text>

            <Row gap={8} style={{ marginTop: 10 }}>
              <Button kind="go" big title={t(lang, 'yes')} style={{ flex: 1 }} onPress={() => accept(item)} />
              <Button kind="danger" title={t(lang, 'no')} style={{ width: 84 }} onPress={() => setJobs((v) => v.filter((x) => x.id !== item.id))} />
            </Row>
          </Card>
        );
      }}
    />
  );
}
