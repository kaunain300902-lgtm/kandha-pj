import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { api, type Trade } from '../src/api';
import { useApp } from '../src/store';
import { Button, Card, Chip, Label } from '../src/ui';
import { C, S, T } from '../src/theme';
import { say } from '../src/speak';
import type { Lang } from '../src/i18n';

const TRADES: Array<{ k: Trade; en: string; hi: string }> = [
  { k: 'HEADLOAD', en: 'Head-load', hi: 'सिर पर' },
  { k: 'HANDCART', en: 'Handcart', hi: 'ठेला' },
  { k: 'HANDVAN', en: 'Hand van', hi: 'हाथ वैन' },
  { k: 'PORTER', en: 'Porter', hi: 'कुली' },
];

export default function WorkerRegister() {
  const { city, refresh } = useApp();
  const [name, setName] = useState('');
  const [lang, setLang] = useState<Lang>('hi');
  const [trades, setTrades] = useState<Trade[]>(['HEADLOAD']);
  const [marketId, setMarketId] = useState<string>(city?.markets[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !marketId) return Alert.alert('Fill your name and market');
    setBusy(true);
    try {
      const r = await api.registerWorker({ name: name.trim(), lang, trades, marketId });
      await refresh();
      say(lang === 'hi' ? 'कार्ड बन रहा है। बाज़ार के डेस्क पर आधार लेकर आइए।' : r.next, lang);
      Alert.alert('Almost done', r.next, [{ text: 'See work', onPress: () => router.replace('/(worker)/board') }]);
    } catch (e: any) { Alert.alert('Could not register', e.message); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md }}>
      <Text style={T.body}>
        Nothing to pay, no documents to upload here. A person at the market desk checks your Aadhaar and
        makes your card — until then you can look at work but not take it.
      </Text>

      <View>
        <Label>Language</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['hi', 'bn', 'en'] as Lang[]).map((l) => (
            <Chip key={l} label={{ hi: 'हिन्दी', bn: 'বাংলা', en: 'English' }[l]}
              on={lang === l} onPress={() => { setLang(l); say({ hi: 'हिन्दी', bn: 'বাংলা', en: 'English' }[l], l); }} />
          ))}
        </View>
      </View>

      <View>
        <Label>Your name</Label>
        <Card><TextInput value={name} onChangeText={setName} placeholder="Ramesh Sahni"
          placeholderTextColor={C.ink3} style={{ fontSize: 19, fontWeight: '700', color: C.ink }} /></Card>
      </View>

      <View>
        <Label>What work do you do</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TRADES.map((tr) => (
            <Chip key={tr.k} label={lang === 'hi' ? tr.hi : tr.en} on={trades.includes(tr.k)}
              onPress={() => setTrades((v) => v.includes(tr.k) ? (v.length > 1 ? v.filter((x) => x !== tr.k) : v) : [...v, tr.k])} />
          ))}
        </View>
      </View>

      <View>
        <Label>Your market</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(city?.markets ?? []).map((m) => (
            <Chip key={m.id} label={m.name} on={marketId === m.id} onPress={() => setMarketId(m.id)} />
          ))}
        </View>
      </View>

      <Button big loading={busy} title="Finish registration" onPress={submit} />
    </ScrollView>
  );
}
