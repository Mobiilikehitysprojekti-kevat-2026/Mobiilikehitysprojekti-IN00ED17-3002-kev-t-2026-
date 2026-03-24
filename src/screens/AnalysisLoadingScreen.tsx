import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { uploadAnalyzeImage } from '../api/useAnalyzeMutation';
import { DEFAULT_LOCALE } from '../config/env';
import { useImageProcessor } from '../hooks/useImageProcessor';
import { resolveSupportedLocale } from '../i18n';
import type { RootStackParamList } from '../navigation/types';
import { useAppShellStore } from '../store';
import { palette } from '../theme/colors';
import type { ApiError } from '../types/api';
import { normalizeApiError } from '../utils/errors';

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'AnalysisLoading'>;

export function AnalysisLoadingScreen({ navigation, route }: ScreenProps) {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const { processForUpload } = useImageProcessor();
    const setLatestAnalysis = useAppShellStore((state) => state.setLatestAnalysis);
    const [attempt, setAttempt] = useState(0);
    const [error, setError] = useState<ApiError | null>(null);
    const startedRef = useRef(false);
    const requestVersionRef = useRef(0);
    const pulse = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    toValue: 1,
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    toValue: 0.35,
                    useNativeDriver: true,
                }),
            ]),
        );

        animation.start();
        return () => {
            animation.stop();
        };
    }, [pulse]);

    useEffect(() => {
        if (startedRef.current) {
            return;
        }

        startedRef.current = true;
        requestVersionRef.current += 1;
        const requestVersion = requestVersionRef.current;

        void (async () => {
            try {
                const processed = await processForUpload(route.params.image);
                const analysis = await uploadAnalyzeImage({
                    image: {
                        mimeType: processed.mimeType,
                        uri: processed.uri,
                    },
                    locale: resolveSupportedLocale(i18n.language) || DEFAULT_LOCALE,
                });

                if (requestVersion !== requestVersionRef.current) {
                    return;
                }

                queryClient.setQueryData(['analysis', analysis.requestId], analysis);
                setLatestAnalysis(analysis, processed.uri);
                navigation.replace('Ingredients', {
                    analysis,
                    sourceImageUri: processed.uri,
                });
            } catch (caughtError) {
                if (requestVersion !== requestVersionRef.current) {
                    return;
                }

                setError(normalizeApiError(caughtError));
            }
        })();

        return undefined;
    }, [
        attempt,
        i18n.language,
        navigation,
        processForUpload,
        queryClient,
        route.params.image,
        setLatestAnalysis,
    ]);

    return (
        <LinearGradient colors={[palette.background, palette.backgroundAlt]} style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    <View style={styles.heroIcon}>
                        <MaterialCommunityIcons color={palette.background} name="star-four-points" size={42} />
                    </View>
                    <Text style={styles.title}>{t('analyzing')}</Text>
                    <Text style={styles.subtitle}>{t('analyzeHint')}</Text>

                    <View style={styles.skeletonWrap}>
                        {[0, 1, 2].map((item) => (
                            <Animated.View
                                key={item}
                                style={[
                                    styles.skeletonCard,
                                    {
                                        opacity: pulse,
                                        transform: [{ scale: item === 1 ? 1.02 : 1 }],
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {error ? (
                        <View style={styles.errorState}>
                            <Text style={styles.errorTitle}>{t('scanError')}</Text>
                            <Text style={styles.errorBody}>{error.message}</Text>
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => {
                                    startedRef.current = false;
                                    setError(null);
                                    setAttempt((current) => current + 1);
                                }}
                                style={styles.retryButton}
                            >
                                <Text style={styles.retryButtonText}>{t('tryAgain')}</Text>
                            </Pressable>
                        </View>
                    ) : null}
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    heroIcon: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 999,
        height: 82,
        justifyContent: 'center',
        marginBottom: 24,
        width: 82,
    },
    title: {
        color: palette.textPrimary,
        fontSize: 28,
        fontWeight: '900',
        textAlign: 'center',
    },
    subtitle: {
        color: palette.textSecondary,
        fontSize: 16,
        lineHeight: 24,
        marginTop: 10,
        maxWidth: 320,
        textAlign: 'center',
    },
    skeletonWrap: {
        marginTop: 30,
        width: '100%',
    },
    skeletonCard: {
        backgroundColor: palette.surface,
        borderRadius: 22,
        height: 92,
        marginBottom: 14,
        width: '100%',
    },
    errorState: {
        alignItems: 'center',
        backgroundColor: palette.warningSoft,
        borderColor: palette.warningBorder,
        borderRadius: 24,
        borderWidth: 1,
        marginTop: 12,
        padding: 18,
        width: '100%',
    },
    errorTitle: {
        color: palette.warning,
        fontSize: 18,
        fontWeight: '900',
    },
    errorBody: {
        color: palette.textPrimary,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 8,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: palette.primary,
        borderRadius: 16,
        marginTop: 16,
        paddingHorizontal: 18,
        paddingVertical: 12,
    },
    retryButtonText: {
        color: palette.background,
        fontSize: 14,
        fontWeight: '900',
    },
});
