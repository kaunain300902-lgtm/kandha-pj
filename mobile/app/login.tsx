import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../src/api';
import { useApp } from '../src/store';
import { Button, Card, Label } from '../src/ui';
import { C, S, T } from '../src/theme';

export default function Login() {
  const { intent, cityId } = useLocalSearchParams<{ intent?: string; cityId?: string }>();
  const { signIn } = useApp();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);

  const request = async () => {
    setBusy(true);
    try {
      const r = await api.requestOtp(phone);
      setStage('code');
      if (r.devCode) Alert.alert('Development mode', `Your code is ${r.devCode}`);
    } catch (e: any) { Alert.alert('Could not send code', e.message); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const { token, user } = await api.verifyOtp({ phone, code, cityId: cityId || undefined });
      await signIn(token, user);
      if (intent === 'worker' && !user.worker) router.replace('/worker-register');
      else if (user.role === 'WORKER' && user.worker) router.replace('/(worker)/board');
      else router.replace('/(booker)/book');
    } catch (e: any) { Alert.alert('Could not sign in', e.message); }
    finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, padding: S.lg, gap: S.md }}>
      <Text style={T.h2}>{stage === 'phone' ? 'Your mobile number' : 'Enter the code'}</Text>
      <Text style={T.body}>
        {stage === 'phone'
          ? 'We send a six-digit code by SMS. No password, no forms.'
          : `Sent to ${phone}. It expires in five minutes.`}
      </Text>

      <Card>
        {stage === 'phone' ? (
          <>
            <Label>Mobile number</Label>
            <TextInput
              value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10}
              placeholder="98301 44712" placeholderTextColor={C.ink3}
              style={{ fontSize: 22, fontWeight: '700', color: C.ink, paddingVertical: 6 }}
            />
          </>
        ) : (
          <>
            <Label>Six-digit code</Label>
            <TextInput
              value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6}
              placeholder="000000" placeholderTextColor={C.ink3}
              style={{ fontSize: 28, fontWeight: '800', letterSpacing: 8, color: C.ink, paddingVertical: 6 }}
            />
          </>
        )}
      </Card>

      <Button
        big loading={busy}
        title={stage === 'phone' ? 'Send code' : 'Verify and continue'}
        disabled={stage === 'phone' ? phone.replace(/\D/g, '').length < 10 : code.length < 6}
        onPress={stage === 'phone' ? request : verify}
      />
      {stage === 'code' && <Button kind="ghost" title="Change number" onPress={() => setStage('phone')} />}
    </View>
  );
}
