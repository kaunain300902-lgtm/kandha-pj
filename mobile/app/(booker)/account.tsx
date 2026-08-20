import { Alert, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../src/store';
import { Button, Card, Chip, Label, Row } from '../../src/ui';
import { C, S, T } from '../../src/theme';

export default function Account() {
  const { me, city, cities, setCity, signOut } = useApp();

  return (
    <ScrollView contentContainerStyle={{ padding: S.md, gap: S.md }}>
      <Card>
        <Text style={T.h3}>{me?.name ?? 'Your account'}</Text>
        <Text style={T.small}>{me?.phone}</Text>
        <Text style={T.small}>{city?.name}</Text>
      </Card>

      <View>
        <Label>City</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {cities.map((c) => (
            <Chip key={c.id} label={c.name} on={c.id === city?.id} onPress={() => setCity(c)} />
          ))}
        </View>
        <Text style={[T.small, { marginTop: 8 }]}>
          Changes the markets, the unit ({city?.unit}), the rate band and the languages.
        </Text>
      </View>

      {/* The only doorway to the worker side. It starts a separate registration
          and its own verification — it never flips this account over. */}
      <Card style={{ backgroundColor: C.goSoft, borderColor: '#BFE6D3' }}>
        <Text style={T.h3}>Work with us</Text>
        <Text style={[T.small, { marginVertical: 8 }]}>
          Register as a {city?.workerWord?.toLowerCase() ?? 'loader'}, handcart or hand van puller.
          A separate registration with a check at the market desk.
        </Text>
        <Button kind="go" title="Start worker registration" onPress={() => router.push('/worker-register')} />
      </Card>

      <Card>
        <Text style={[T.small]}>
          <Text style={{ fontWeight: '800', color: C.ink }}>What this account cannot see. </Text>
          The work board, any worker's earnings, what other bookers are paying, or who is idle right now.
        </Text>
      </Card>

      <Button
        kind="ghost" title="Sign out"
        onPress={() => Alert.alert('Sign out?', '', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/'); } },
        ])}
      />
    </ScrollView>
  );
}
