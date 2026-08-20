import * as Speech from 'expo-speech';
import type { Lang } from './i18n';

const VOICE: Record<Lang, string> = { hi: 'hi-IN', bn: 'bn-IN', en: 'en-IN' };

/**
 * Voice out is the reliable half of the interface. Speech recognition on Indic
 * languages over a phone line still runs 22–30% word error, so the app reads
 * things out and never depends on hearing anything back.
 */
export function say(text: string, lang: Lang = 'hi') {
  Speech.stop();
  Speech.speak(text, { language: VOICE[lang], rate: 0.86, pitch: 1.0 });
}
export const stopSpeaking = () => Speech.stop();
