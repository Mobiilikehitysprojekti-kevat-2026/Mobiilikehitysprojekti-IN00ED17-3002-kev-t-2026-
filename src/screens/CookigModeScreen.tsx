import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ImageBackground,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconCircleButton } from '../components/atoms/IconCircleButton';
import { useAudioQueue } from '../hooks/useAudioQueue';
import { resolveSupportedLocale } from '../i18n';
import type { RootStackParamList } from '../navigation/types';
import { useCookingSessionStore } from '../store';
import { palette } from '../theme/colors';

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'CookingMode'>;

function formatDuration(durationSeconds?: number) {
    if (!durationSeconds || durationSeconds <= 0) {
        return null;
    }

    const minutes = Math.max(1, Math.round(durationSeconds / 60));
    return `${minutes} min`;
}

function deriveStepVisual(
    instruction: string,
    labelGetter: (key: string) => string,
): {
    iconName: ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
} {
    const normalized = instruction.toLowerCase();

    if (/(chop|slice|dice|mince|peel|grate|cut)/.test(normalized)) {
        return {
            iconName: 'knife',
            label: labelGetter('stepActionPrep'),
        };
    }

    if (/(mix|stir|combine|whisk|fold|toss)/.test(normalized)) {
        return {
            iconName: 'pot-mix',
            label: labelGetter('stepActionMix'),
        };
    }

    if (/(bake|roast)/.test(normalized)) {
        return {
            iconName: 'stove',
            label: labelGetter('stepActionBake'),
        };
    }

    if (/(boil|simmer)/.test(normalized)) {
        return {
            iconName: 'pot-steam',
            label: labelGetter('stepActionBoil'),
        };
    }

    if (/(season|salt|pepper|spice|marinate)/.test(normalized)) {
        return {
            iconName: 'shaker-outline',
            label: labelGetter('stepActionSeason'),
        };
    }

    if (/(serve|plate|garnish)/.test(normalized)) {
        return {
            iconName: 'silverware-fork-knife',
            label: labelGetter('stepActionServe'),
        };
    }

    if (/(rest|cool|wait|set aside)/.test(normalized)) {
        return {
            iconName: 'timer-sand',
            label: labelGetter('stepActionRest'),
        };
    }

    if (/(cook|saute|fry|sear|heat)/.test(normalized)) {
        return {
            iconName: 'pan',
            label: labelGetter('stepActionCook'),
        };
    }

    return {
        iconName: 'chef-hat',
        label: labelGetter('stepActionDefault'),
    };
}

function buildNarrationText(instruction: string, tip?: string) {
    if (!tip) {
        return instruction;
    }

    return `${instruction}. ${tip}`;
}

export function CookingModeScreen({ navigation, route }: ScreenProps) {
    const { t, i18n } = useTranslation();
    const insets = useSafeAreaInsets();
    useKeepAwake('fridgechef-cooking');

    const recipe = useCookingSessionStore((state) => state.recipe);
    const currentStepIndex = useCookingSessionStore((state) => state.currentStepIndex);
    const status = useCookingSessionStore((state) => state.status);
    const isTTSEnabled = useCookingSessionStore((state) => state.isTTSEnabled);
    const startSession = useCookingSessionStore((state) => state.startSession);
    const nextStep = useCookingSessionStore((state) => state.nextStep);
    const prevStep = useCookingSessionStore((state) => state.prevStep);
    const togglePause = useCookingSessionStore((state) => state.togglePause);
    const toggleTTS = useCookingSessionStore((state) => state.toggleTTS);
    const { isSpeaking, isVoiceReady, speakNow, stop } = useAudioQueue();
    const mountedRecipeId = useRef<string | null>(null);
    const lastNarratedStepRef = useRef<number | null>(null);
    const [voiceMessage, setVoiceMessage] = useState<string | null>(null);

    useEffect(() => {
        if (mountedRecipeId.current !== route.params.recipe.id) {
            mountedRecipeId.current = route.params.recipe.id;
            lastNarratedStepRef.current = null;
            startSession(route.params.recipe, resolveSupportedLocale(i18n.language), 0);
            setVoiceMessage(null);
        }
    }, [i18n.language, route.params.recipe, startSession]);

    const safeRecipe = recipe ?? route.params.recipe;
    const currentStep = safeRecipe.steps[currentStepIndex] ?? safeRecipe.steps[0];
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === safeRecipe.steps.length - 1;
    const progress = ((currentStepIndex + 1) / safeRecipe.steps.length) * 100;
    const stepVisual = deriveStepVisual(`${currentStep.instruction} ${currentStep.tip ?? ''}`, t);
    const durationLabel = formatDuration(currentStep.durationSeconds);
    const narrationLocale = resolveSupportedLocale(i18n.language);

    useEffect(() => {
        if (!isTTSEnabled || status === 'paused') {
            void stop();
            return;
        }

        if (lastNarratedStepRef.current === currentStep.stepNumber) {
            return;
        }

        lastNarratedStepRef.current = currentStep.stepNumber;
        void speakNow(buildNarrationText(currentStep.instruction, currentStep.tip), narrationLocale);
    }, [
        currentStep.instruction,
        currentStep.stepNumber,
        currentStep.tip,
        isTTSEnabled,
        narrationLocale,
        speakNow,
        status,
        stop,
    ]);

    const handleVoiceToggle = () => {
        if (!isVoiceReady) {
            setVoiceMessage(t('stepVoiceUnavailable'));
            return;
        }

        lastNarratedStepRef.current = null;

        if (isTTSEnabled) {
            toggleTTS();
            void stop();
            setVoiceMessage(t('ttsOff'));
            return;
        }

        toggleTTS();
        setVoiceMessage(t('ttsOn'));
    };

    const handleNext = () => {
        if (isLastStep) {
            navigation.replace('Completion', {
                recipe: safeRecipe,
                sourceImageUri: route.params.sourceImageUri,
            });
            return;
        }

        nextStep();
    };

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_event, gestureState) =>
                    Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dy) < 30,
                onPanResponderRelease: (_event, gestureState) => {
                    if (gestureState.dx < -70) {
                        handleNext();
                    }
                    if (gestureState.dx > 70 && !isFirstStep) {
                        prevStep();
                    }
                },
            }),
        [handleNext, isFirstStep, prevStep],
    );

    const voiceStatus = isVoiceReady
        ? voiceMessage ?? t('stepVoiceReady')
        : t('stepVoiceUnavailable');

    return (
        <LinearGradient colors={[palette.background, '#081208']} style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingBottom: 176 + insets.bottom,
                        },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <IconCircleButton
                            backgroundColor={palette.primarySoft}
                            iconColor={palette.primary}
                            iconName="close"
                            onPress={() => navigation.goBack()}
                            size={52}
                        />

                        <View style={styles.headerCenter}>
                            <Text style={styles.headerEyebrow}>{t('cookingMode')}</Text>
                            <Text style={styles.headerTitle}>
                                {t('step', {
                                    current: currentStep.stepNumber,
                                    total: safeRecipe.steps.length,
                                })}
                            </Text>
                        </View>

                        <IconCircleButton
                            backgroundColor={palette.primarySoft}
                            iconColor={isTTSEnabled ? palette.primary : palette.textSecondary}
                            iconName={isTTSEnabled ? 'volume-high' : 'play-circle-outline'}
                            onPress={handleVoiceToggle}
                            size={52}
                        />
                    </View>

                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>

                    <View {...panResponder.panHandlers}>
                        <ImageBackground
                            source={route.params.sourceImageUri ? { uri: route.params.sourceImageUri } : undefined}
                            style={styles.visualCard}
                        >
                            <LinearGradient
                                colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.62)']}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.visualTopRow}>
                                <View style={styles.visualBadge}>
                                    <MaterialCommunityIcons
                                        color={palette.background}
                                        name={stepVisual.iconName}
                                        size={18}
                                    />
                                    <Text style={styles.visualBadgeText}>{stepVisual.label}</Text>
                                </View>
                                {durationLabel ? (
                                    <View style={styles.durationChip}>
                                        <MaterialCommunityIcons
                                            color={palette.textPrimary}
                                            name="timer-outline"
                                            size={16}
                                        />
                                        <Text style={styles.durationChipText}>{durationLabel}</Text>
                                    </View>
                                ) : null}
                            </View>

                            <View style={styles.voiceButton}>
                                <MaterialCommunityIcons
                                    color={palette.background}
                                    name={isSpeaking || isTTSEnabled ? 'volume-high' : 'play'}
                                    size={24}
                                />
                            </View>
                        </ImageBackground>

                        <Text style={styles.stepInstruction}>{currentStep.instruction}</Text>

                        <View style={styles.voiceStatusCard}>
                            <MaterialCommunityIcons
                                color={isTTSEnabled ? palette.primary : palette.textSecondary}
                                name={isTTSEnabled ? 'waveform' : 'volume-low'}
                                size={18}
                            />
                            <Text style={styles.voiceStatusText}>{voiceStatus}</Text>
                        </View>

                        {currentStep.tip ? (
                            <View style={styles.noteCard}>
                                <View style={styles.noteBadge}>
                                    <Text style={styles.noteBadgeText}>{t('chefNote')}</Text>
                                </View>
                                <Text style={styles.noteText}>{currentStep.tip}</Text>
                            </View>
                        ) : null}
                    </View>
                </ScrollView>
            </SafeAreaView>

            <View
                style={[
                    styles.bottomBar,
                    {
                        paddingBottom: Math.max(insets.bottom, 16),
                    },
                ]}
            >
                <Pressable
                    accessibilityRole="button"
                    disabled={isFirstStep}
                    onPress={prevStep}
                    style={[styles.secondaryButton, isFirstStep && styles.buttonDisabled]}
                >
                    <Text style={styles.secondaryButtonText}>{t('back')}</Text>
                </Pressable>

                <Pressable accessibilityRole="button" onPress={togglePause} style={styles.pauseButton}>
                    <MaterialCommunityIcons
                        color={palette.primary}
                        name={status === 'paused' ? 'play' : 'pause'}
                        size={22}
                    />
                    <Text style={styles.pauseButtonText}>
                        {status === 'paused' ? t('resume') : t('pause')}
                    </Text>
                </Pressable>

                <Pressable accessibilityRole="button" onPress={handleNext} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>{isLastStep ? t('finish') : t('nextStep')}</Text>
                </Pressable>
            </View>
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
    scrollContent: {
        paddingHorizontal: 18,
        paddingTop: 10,
    },
    header: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 18,
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerEyebrow: {
        color: palette.primary,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.2,
    },
    headerTitle: {
        color: palette.textPrimary,
        fontSize: 25,
        fontWeight: '900',
        marginTop: 4,
    },
    progressTrack: {
        backgroundColor: 'rgba(105, 227, 16, 0.16)',
        borderRadius: 999,
        height: 12,
        marginBottom: 18,
        overflow: 'hidden',
    },
    progressFill: {
        backgroundColor: palette.primary,
        borderRadius: 999,
        height: '100%',
    },
    visualCard: {
        alignItems: 'center',
        backgroundColor: palette.surface,
        borderColor: palette.primary,
        borderRadius: 24,
        borderWidth: 2,
        height: 212,
        justifyContent: 'center',
        overflow: 'hidden',
        padding: 16,
    },
    visualTopRow: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        justifyContent: 'space-between',
        left: 16,
        position: 'absolute',
        right: 16,
        top: 16,
    },
    visualBadge: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 999,
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    visualBadgeText: {
        color: palette.background,
        fontSize: 12,
        fontWeight: '900',
    },
    durationChip: {
        alignItems: 'center',
        backgroundColor: 'rgba(7, 26, 8, 0.78)',
        borderColor: palette.outlineStrong,
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    durationChipText: {
        color: palette.textPrimary,
        fontSize: 12,
        fontWeight: '800',
    },
    voiceButton: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 999,
        height: 58,
        justifyContent: 'center',
        width: 58,
    },
    stepInstruction: {
        color: palette.textPrimary,
        fontSize: 28,
        fontWeight: '900',
        lineHeight: 36,
        marginTop: 18,
    },
    voiceStatusCard: {
        alignItems: 'center',
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 18,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    voiceStatusText: {
        color: palette.textSecondary,
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
    },
    noteCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderColor: palette.outlineStrong,
        borderRadius: 22,
        borderWidth: 1,
        marginTop: 18,
        padding: 16,
    },
    noteBadge: {
        alignSelf: 'flex-start',
        backgroundColor: palette.warningSoft,
        borderColor: palette.warningBorder,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    noteBadgeText: {
        color: palette.warning,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    noteText: {
        color: palette.textPrimary,
        fontSize: 15,
        lineHeight: 22,
        marginTop: 12,
    },
    bottomBar: {
        backgroundColor: 'rgba(7, 26, 8, 0.96)',
        borderTopColor: palette.outlineStrong,
        borderTopWidth: 1,
        bottom: 0,
        flexDirection: 'row',
        gap: 12,
        left: 0,
        paddingHorizontal: 18,
        paddingTop: 14,
        position: 'absolute',
        right: 0,
    },
    secondaryButton: {
        alignItems: 'center',
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 18,
        borderWidth: 1,
        flex: 1,
        justifyContent: 'center',
        paddingVertical: 16,
    },
    buttonDisabled: {
        opacity: 0.4,
    },
    secondaryButtonText: {
        color: palette.textPrimary,
        fontSize: 14,
        fontWeight: '900',
    },
    pauseButton: {
        alignItems: 'center',
        backgroundColor: palette.primarySoft,
        borderColor: palette.primaryBorder,
        borderRadius: 18,
        borderWidth: 1,
        flex: 1,
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        paddingVertical: 16,
    },
    pauseButtonText: {
        color: palette.primary,
        fontSize: 14,
        fontWeight: '900',
    },
    primaryButton: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 18,
        flex: 1.35,
        justifyContent: 'center',
        paddingVertical: 16,
    },
    primaryButtonText: {
        color: palette.background,
        fontSize: 15,
        fontWeight: '900',
    },
});
