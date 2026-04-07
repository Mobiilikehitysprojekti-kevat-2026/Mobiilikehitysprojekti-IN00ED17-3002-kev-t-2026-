import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';

import type { Locale } from '../types/api';

interface SpeakResult {
  ok: boolean;
  voiceName?: string;
}

type Voice = Awaited<ReturnType<typeof Speech.getAvailableVoicesAsync>>[number];

function normalizeVoiceLanguage(language: string) {
  return language.toLowerCase().split(/[-_]/)[0] ?? language.toLowerCase();
}

function selectPreferredVoice(voices: Voice[], locale: Locale) {
  if (voices.length === 0) {
    return null;
  }

  const exactLanguageMatch = voices.filter(
    (voice) => voice.language.toLowerCase() === locale,
  );
  const localeFamilyMatch = voices.filter(
    (voice) => normalizeVoiceLanguage(voice.language) === locale,
  );
  const exactEnhanced =
    exactLanguageMatch.find((voice) => voice.quality === Speech.VoiceQuality.Enhanced) ??
    localeFamilyMatch.find((voice) => voice.quality === Speech.VoiceQuality.Enhanced);

  return exactEnhanced ?? exactLanguageMatch[0] ?? localeFamilyMatch[0] ?? voices[0];
}

function voiceRate(locale: Locale) {
  return locale === 'fi' ? 0.9 : 0.95;
}

export function useAudioQueue() {
  const voicesRef = useRef<Voice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceReady, setIsVoiceReady] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        if (!cancelled) {
          voicesRef.current = voices;
          setIsVoiceReady(true);
        }
      } catch {
        if (!cancelled) {
          voicesRef.current = [];
          setIsVoiceReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const stop = useCallback(async () => {
    setIsSpeaking(false);
    await Speech.stop();
  }, []);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  const speakNow = useCallback(
    async (text: string, locale: Locale): Promise<SpeakResult> => {
      if (text.trim().length === 0) {
        return { ok: false };
      }

      const voice = selectPreferredVoice(voicesRef.current, locale);
      await Speech.stop();

      return new Promise<SpeakResult>((resolve) => {
        setIsSpeaking(true);

        Speech.speak(text, {
          language: locale,
          onDone: () => {
            setIsSpeaking(false);
            resolve({
              ok: true,
              voiceName: voice?.name,
            });
          },
          onError: () => {
            setIsSpeaking(false);
            setIsVoiceReady(false);
            resolve({ ok: false });
          },
          onStopped: () => {
            setIsSpeaking(false);
            resolve({ ok: false });
          },
          pitch: locale === 'fi' ? 0.98 : 1,
          rate: voiceRate(locale),
          useApplicationAudioSession: false,
          voice: voice?.identifier,
        });
      });
    },
    [],
  );

  return {
    isSpeaking,
    isVoiceReady,
    speakNow,
    stop,
  };
}