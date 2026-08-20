import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../src/store';
import { Button, Card, Chip, Row } from '../src/ui';
import { C, R, S, T } from '../src/theme';

/**
 * The gate. One download, two doors. Which door you take — plus whether a human
 * at the market desk has verified you — decides everything you can see after
 * this screen. A booking account can never reach the worker side.
 */
export default function Gate() {
  const { ready, me, cities, city, setCity } = useApp();
  const [pickCity, setPickCity] = useState(false);

  useEffect(() => {
    if (!ready || !me) return;
    if (me.role === 'WORKER' && me.worker) router.replace('/(worker)/board');
    else router.replace('/(booker)/book');
  }, [ready, me]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper }}>
        <ActivityIndicator color={C.brand} size="large" />
      </View>
    );
  }

  const go = (intent: 'booker' | 'worker') =>
    router.push({ pathname: '/login', params: { intent, cityId: city?.id ?? '' } });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md }}>
        <Row gap={12} style={{ marginBottom: 4 }}>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.brand }} />
          <View style={{ flex: 1 }}>
            <Text style={T.h1}>Kandha</Text>
            <Text style={T.small}>Loaders, porters and handcarts, booked in minutes</Text>
          </View>
        </Row>

        <Pressable onPress={() => setPickCity((v) => !v)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: C.ink }}>
              {city?.name ?? 'Choose your city'}
            </Text>
            <Text style={{ color: C.brand, fontWeight: '800', fontSize: 13 }}>
              {pickCity ? 'Done' : 'Change city'}
            </Text>
          </Card>
        </Pressable>

        {pickCity && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cities.map((c) => (
              <Chip key={c.id} label={c.name} on={c.id === city?.id}
                onPress={() => { setCity(c); setPickCity(false); }} />
            ))}
          </View>
        )}

        {!!city && (
          <Text style={T.small}>
            {city.workerWord}s · counted in {city.unit}s · union band ₹{city.bandLow}–{city.bandHigh} per {city.unit}
          </Text>
        )}

        <Pressable onPress={() => go('booker')}>
          <Card style={{ borderColor: C.brand, backgroundColor: C.brandSoft, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: R.md, backgroundColor: C.brand }} />
            <View style={{ flex: 1 }}>
              <Text style={T.h3}>I need hands</Text>
              <Text style={T.small}>Book a loader, handcart or hand van — for your shop or your own load</Text>
            </View>
          </Card>
        </Pressable>

        <Pressable onPress={() => go('worker')}>
          <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: R.md, backgroundColor: C.goSoft }} />
            <View style={{ flex: 1 }}>
              <Text style={T.h3}>I want work</Text>
              <Text style={T.small}>
                Register as a {city?.workerWord?.toLowerCase() ?? 'loader'}, handcart puller or porter
              </Text>
            </View>
          </Card>
        </Pressable>

        <Text style={[T.small, { textAlign: 'center', marginTop: S.sm }]}>
          Kandha never charges a worker to join, and takes nothing from his wage.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
