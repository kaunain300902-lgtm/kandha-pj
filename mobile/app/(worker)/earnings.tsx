import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { useApp } from '../../src/store';
import { t } from '../../src/i18n';
import { Card, Row } from '../../src/ui';
import { C, R, S, T } from '../../src/theme';

export default function Earnings() {
  const { lang, me, city } = useApp();
  const [e, setE] = useState<{ todayAmount: number; todayUnits: number; weekAmount: number; lifetimeJobs: number; rating: number } | null>(null);

  useFocusEffect(useCallback(() => {
    api.earnings().then(setE).catch(() => {});
  }, []));

  return (
    <ScrollView contentContainerStyle={{ padding: S.md, gap: S.md }}>
      <Row gap={10}>
        <View style={{ flex: 1, backgroundColor: C.brand, borderRadius: R.lg, padding: S.md }}>
          <Text style={{ color: '#fff', fontSize: 27, fontWeight: '800' }}>₹{e?.todayAmount ?? 0}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5 }}>{t(lang, 'today')}</Text>
        </View>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 27, fontWeight: '800', color: C.ink }}>₹{e?.weekAmount ?? 0}</Text>
          <Text style={T.small}>{t(lang, 'week')}</Text>
        </Card>
      </Row>

      {/* The card. Photo, number, market — the thing he shows, and the thing
          that lets him work a market where nobody knows his face. */}
      <View style={{ backgroundColor: C.ink, borderRadius: R.lg, padding: S.lg }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{me?.name ?? '—'}</Text>
        <Text style={{ color: '#A9B0BC', fontSize: 13 }}>
          {me?.worker?.market?.name ?? ''} · {city?.name ?? ''}
        </Text>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 6, marginTop: 14 }}>
          KND {me?.worker?.code ?? '—'}
        </Text>
        <Text style={{ color: '#A9B0BC', fontSize: 12, marginTop: 6 }}>
          {me?.worker?.verify === 'VERIFIED' ? 'Verified at the market desk' : 'Verification pending'}
        </Text>
      </View>

      <Row gap={10}>
        <Card style={{ flex: 1 }}>
          <Text style={T.bigNum}>{e?.lifetimeJobs ?? 0}</Text>
          <Text style={T.small}>jobs done</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={T.bigNum}>★ {e?.rating ? e.rating.toFixed(1) : '—'}</Text>
          <Text style={T.small}>rating</Text>
        </Card>
      </Row>

      <Card>
        <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 6 }}>e-Shram card</Text>
        <Text style={T.small}>
          Aadhaar and a mobile number is the whole requirement, and it costs nothing. Ask at the market desk —
          it unlocks accident cover and state welfare schemes you are already entitled to.
        </Text>
      </Card>
    </ScrollView>
  );
}
