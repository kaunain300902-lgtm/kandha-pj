import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { api, type Fare, type Trade } from '../../src/api';
import { useApp } from '../../src/store';
import { Button, Card, Chip, Label, LocStack, Money, Row, Stepper } from '../../src/ui';
import { C, R, S, T } from '../../src/theme';

const SERVICES: Array<{ k: Trade; name: string; sub: string }> = [
  { k: 'HEADLOAD', name: 'Head-load', sub: 'one man, on the head' },
  { k: 'HANDCART', name: 'Handcart', sub: 'thela, short haul' },
  { k: 'HANDVAN', name: 'Hand van', sub: 'flat four-wheeler' },
  { k: 'PORTER', name: 'Porter', sub: 'station licensed' },
];

const DROPS = ['Transport company', 'Packer', 'Truck stand', 'Taxi / auto stand', 'Bus stop', 'Railway station', 'My vehicle at the gate'];

export default function Book() {
  const { city, me } = useApp();
  const [kind, setKind] = useState<'BUSINESS' | 'PERSONAL'>('BUSINESS');
  const [trade, setTrade] = useState<Trade>('HEADLOAD');
  const [units, setUnits] = useState(8);
  const [kg, setKg] = useState(35);
  const [helpers, setHelpers] = useState(2);
  const [extra, setExtra] = useState(0);
  const [allowOutside, setAllowOutside] = useState(true);
  const [marketId, setMarketId] = useState(city?.markets[0]?.id ?? '');
  const [pickup, setPickup] = useState('');
  const [pickupNote, setPickupNote] = useState('');
  const [drop, setDrop] = useState(DROPS[0]!);
  const [dropOpen, setDropOpen] = useState(false);
  const [fare, setFare] = useState<Fare | null>(null);
  const [busy, setBusy] = useState(false);

  const unit = city?.unit ?? 'nag';
  const market = useMemo(() => city?.markets.find((m) => m.id === marketId), [city, marketId]);

  useEffect(() => {
    if (!marketId && city?.markets[0]) setMarketId(city.markets[0].id);
    if (!pickup && market) setPickup(`${market.name} · my shop`);
  }, [city, marketId, market]);

  // The fare is always computed on the server. The client never invents a price.
  useEffect(() => {
    if (!city) return;
    const id = setTimeout(() => {
      api.quote({ cityId: city.id, units, kgPerUnit: kg, helpers, extra })
        .then((r) => setFare(r.fare)).catch(() => {});
    }, 250);
    return () => clearTimeout(id);
  }, [city?.id, units, kg, helpers, extra]);

  const book = async () => {
    if (!city || !marketId) return;
    setBusy(true);
    try {
      const { job } = await api.createJob({
        cityId: city.id, marketId, kind, trade, units, kgPerUnit: kg, helpers,
        pickupText: pickup, pickupNote: pickupNote || undefined, dropText: drop,
        extra, allowOutside,
      });
      router.push(`/trip/${job.id}`);
    } catch (e: any) { Alert.alert('Could not book', e.message); }
    finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: S.md, gap: S.md, paddingBottom: 120 }}>
        <Row gap={8}>
          {(['BUSINESS', 'PERSONAL'] as const).map((k) => (
            <Pressable key={k} onPress={() => setKind(k)} style={{ flex: 1 }}>
              <View style={{ paddingVertical: 12, borderRadius: R.md, alignItems: 'center',
                backgroundColor: kind === k ? C.brand : C.paper, borderWidth: 1.5,
                borderColor: kind === k ? C.brand : C.line }}>
                <Text style={{ fontWeight: '800', color: kind === k ? '#fff' : C.ink2 }}>
                  {k === 'BUSINESS' ? 'Business' : 'Personal'}
                </Text>
              </View>
            </Pressable>
          ))}
        </Row>

        <LocStack
          pickup={pickup || 'Set the pick-up point'}
          pickupSub={pickupNote || market?.name}
          drop={drop}
          onDrop={() => setDropOpen((v) => !v)}
        />
        {dropOpen && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DROPS.map((d) => (
              <Chip key={d} label={d} on={d === drop} onPress={() => { setDrop(d); setDropOpen(false); }} />
            ))}
          </View>
        )}

        <View>
          <Label>Pick-up point — tell him exactly where</Label>
          <Card>
            <TextInput value={pickup} onChangeText={setPickup} placeholder="Market · my shop"
              placeholderTextColor={C.ink3} style={{ fontSize: 16, fontWeight: '700', color: C.ink }} />
            <View style={{ height: 1, backgroundColor: C.line, marginVertical: 8 }} />
            <TextInput value={pickupNote} onChangeText={setPickupNote} multiline
              placeholder="1st floor, above the sari shop — send him up the back stairs"
              placeholderTextColor={C.ink3} style={{ fontSize: 14, color: C.ink2, minHeight: 44 }} />
          </Card>
          <Text style={[T.small, { marginTop: 6 }]}>
            This line is read aloud to him. A landmark beats an address here.
          </Text>
        </View>

        <View>
          <Label>Market</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(city?.markets ?? []).map((m) => (
              <Chip key={m.id} label={m.name} on={m.id === marketId}
                onPress={() => { setMarketId(m.id); setPickup(`${m.name} · my shop`); }} />
            ))}
          </View>
        </View>

        <View>
          <Label>Select service</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {SERVICES.map((sv) => {
              const on = trade === sv.k;
              return (
                <Pressable key={sv.k} onPress={() => setTrade(sv.k)} style={{ width: '47%' }}>
                  <Card style={{ borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brandSoft : C.paper }}>
                    <Text style={{ fontWeight: '800', fontSize: 15, color: C.ink }}>{sv.name}</Text>
                    <Text style={T.small}>{sv.sub}</Text>
                    <Text style={{ fontWeight: '800', fontSize: 12.5, color: on ? C.brand : C.ink, marginTop: 6 }}>
                      from ₹{city?.bandLow ?? 28}/{unit}
                    </Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Label>How many {unit}s</Label>
          <Stepper value={units} onChange={setUnits} />
        </View>

        <View>
          <Label>Weight per {unit}</Label>
          <Row gap={8}>
            {[20, 35, 50, 60].map((k) => (
              <Chip key={k} label={`${k} kg`} on={kg === k} onPress={() => setKg(k)} />
            ))}
          </Row>
          {kg > 50 && (
            <Card style={{ marginTop: 8, backgroundColor: C.stopSoft, borderColor: '#F6C9C6' }}>
              <Text style={{ color: '#A32219', fontSize: 13.5 }}>
                Above the 50 kg ceiling — Kandha books two people per {unit} instead of one.
              </Text>
            </Card>
          )}
        </View>

        <View>
          <Label>Helpers</Label>
          <Stepper value={helpers} onChange={setHelpers} />
        </View>

        <Card>
          <Row>
            <Text style={{ flex: 1, fontWeight: '800', fontSize: 15, color: C.ink }}>
              Pay more than the fare
            </Text>
            {extra > 0 && <Text style={{ color: C.brand, fontWeight: '800' }}>+ ₹{extra}</Text>}
          </Row>
          <Text style={[T.small, { marginVertical: 8 }]}>
            The band is a floor, not a ceiling. Stairs, rain, a long walk. Every rupee goes to him.
          </Text>
          <Row gap={8}>
            {[0, 20, 50, 100].map((v) => (
              <Chip key={v} label={v ? `+₹${v}` : 'None'} on={extra === v} onPress={() => setExtra(v)} />
            ))}
          </Row>
        </Card>

        <Pressable onPress={() => setAllowOutside((v) => !v)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: C.ink }}>Partners from other markets</Text>
              <Text style={T.small}>Union-endorsed pass holders only</Text>
            </View>
            <View style={{ width: 50, height: 29, borderRadius: 15, padding: 3,
              backgroundColor: allowOutside ? C.go : '#D5D8DE', alignItems: allowOutside ? 'flex-end' : 'flex-start' }}>
              <View style={{ width: 23, height: 23, borderRadius: 12, backgroundColor: '#fff' }} />
            </View>
          </Card>
        </Pressable>

        {!!fare && (
          <Card>
            <Text style={{ fontWeight: '800', fontSize: 15, color: C.ink, marginBottom: 8 }}>Fare estimate</Text>
            <Row><Text style={{ flex: 1, color: C.ink2 }}>{units} {unit}s × ₹{fare.perUnit}</Text>
              <Text style={{ fontWeight: '800' }}>₹{fare.base}</Text></Row>
            <Row style={{ marginTop: 6 }}>
              <Text style={{ flex: 1, color: C.ink2 }}>Union band · {city?.name} · ₹{fare.bandLow}–{fare.bandHigh} per {unit}</Text>
            </Row>
            {fare.extra > 0 && (
              <Row style={{ marginTop: 6 }}>
                <Text style={{ flex: 1, color: C.brand, fontWeight: '700' }}>You added on top</Text>
                <Text style={{ fontWeight: '800', color: C.brand }}>+ ₹{fare.extra}</Text>
              </Row>
            )}
            <Text style={[T.small, { marginTop: 8 }]}>Paid in cash. Kandha never holds or moves money.</Text>
          </Card>
        )}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.paper,
        borderTopWidth: 1, borderTopColor: C.line, padding: S.md, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Money value={fare?.total ?? 0} sub="estimated fare" />
        <Button title="Book now" onPress={book} loading={busy} big style={{ flex: 1 }} />
      </View>
    </View>
  );
}
