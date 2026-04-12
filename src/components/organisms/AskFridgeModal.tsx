import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ImageBackground,
    Keyboard,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAskFridgeMutation } from '../../api/useAskFridgeMutation';
import { resolveSupportedLocale } from '../../i18n';
import { recipeRepository } from '../../repositories/RecipeRepository';
import { useAppShellStore, useAskFridgeSessionStore } from '../../store';
import { palette } from '../../theme/colors';
import type { AskFridgeSuggestionDTO } from '../../types/api';

const ASK_FRIDGE_BACKGROUND_IMAGE =
    'https://images.pexels.com/photos/14930081/pexels-photo-14930081.jpeg?cs=srgb&dl=pexels-merve-205352359-14930081.jpg&fm=jpg';

type AskFridgeModalProps = {
    onClose: () => void;
    onCookRecipe: (suggestion: AskFridgeSuggestionDTO) => void;
    onPreviewRecipe: (suggestion: AskFridgeSuggestionDTO) => void;
    visible: boolean;
};

export function AskFridgeModal({
    onClose,
    onCookRecipe,
    onPreviewRecipe,
    visible,
}: AskFridgeModalProps) {
    const { i18n, t } = useTranslation();
    const insets = useSafeAreaInsets();
    const pantryIngredients = useAppShellStore((state) => state.pantryIngredients);
    const clearSession = useAskFridgeSessionStore((state) => state.clearSession);
    const lastSubmittedPrompt = useAskFridgeSessionStore((state) => state.lastSubmittedPrompt);
    const localAssistantMessage = useAskFridgeSessionStore((state) => state.localAssistantMessage);
    const setLocalAssistantMessage = useAskFridgeSessionStore((state) => state.setLocalAssistantMessage);
    const setPendingPrompt = useAskFridgeSessionStore((state) => state.setPendingPrompt);
    const setSuggestions = useAskFridgeSessionStore((state) => state.setSuggestions);
    const suggestions = useAskFridgeSessionStore((state) => state.suggestions);
    const locale = resolveSupportedLocale(i18n.resolvedLanguage);
    const askFridgeMutation = useAskFridgeMutation();
    const resetAskFridgeMutation = askFridgeMutation.reset;
    const [prompt, setPrompt] = useState('');
    const [keyboardInset, setKeyboardInset] = useState(0);
    const wasVisibleRef = useRef(visible);
    const scrollRef = useRef<ScrollView | null>(null);
    const quickPrompts = useMemo(
        () => [
            t('askFridgeQuickFast'),
            t('askFridgeQuickPantry'),
            t('askFridgeQuickHighProtein'),
            t('askFridgeQuickComfort'),
        ],
        [t],
    );
    const composerDisabled = askFridgeMutation.isPending || prompt.trim().length < 2;
    const hasSavedConversation =
        lastSubmittedPrompt.length > 0 || suggestions.length > 0 || Boolean(localAssistantMessage);

    const pantryIntentPhrases = useMemo(
        () => [t('askFridgeQuickPantry').toLowerCase(), 'pantry', 'varasto'],
        [t],
    );

    useEffect(() => {
        if (!visible) {
            return;
        }

        const timer = setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 120);

        return () => {
            clearTimeout(timer);
        };
    }, [
        askFridgeMutation.isPending,
        lastSubmittedPrompt,
        localAssistantMessage,
        suggestions.length,
        visible,
    ]);

    useEffect(() => {
        if (!visible) {
            setKeyboardInset(0);
            return;
        }

        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const handleShow = Keyboard.addListener(showEvent, (event) => {
            setKeyboardInset(Math.max(0, event.endCoordinates.height - insets.bottom));
        });
        const handleHide = Keyboard.addListener(hideEvent, () => {
            setKeyboardInset(0);
        });

        return () => {
            handleShow.remove();
            handleHide.remove();
        };
    }, [insets.bottom, visible]);

    useEffect(() => {
        const wasVisible = wasVisibleRef.current;
        wasVisibleRef.current = visible;

        if (visible || !wasVisible) {
            return;
        }

        resetAskFridgeMutation();
        setPrompt('');
        setKeyboardInset(0);
    }, [resetAskFridgeMutation, visible]);

    async function submitPrompt(nextPrompt?: string) {
        const normalizedPrompt = (nextPrompt ?? prompt).trim();
        if (normalizedPrompt.length < 2 || askFridgeMutation.isPending) {
            return;
        }

        setPendingPrompt(normalizedPrompt);
        setPrompt('');
        Keyboard.dismiss();

        const normalizedPromptLower = normalizedPrompt.toLowerCase();
        const isPantryIntent = pantryIntentPhrases.some((phrase) => normalizedPromptLower.includes(phrase));

        if (isPantryIntent && pantryIngredients.length === 0) {
            resetAskFridgeMutation();
            setLocalAssistantMessage(
                normalizedPrompt,
                `${t('noPantryItems')}. ${t('askFridgeEmptyPantryHint')}`,
            );
            return;
        }

        try {
            const response = await askFridgeMutation.mutateAsync({
                locale,
                pantryIngredients: pantryIngredients.map((ingredient) => ingredient.name).slice(0, 12),
                prompt: normalizedPrompt,
            });
            setSuggestions(normalizedPrompt, response.suggestions);
        } catch {
            // React Query state holds the error.
        }
    }

    async function handleCookSuggestion(suggestion: AskFridgeSuggestionDTO) {
        await recipeRepository.save(suggestion.recipe, suggestion.image?.url ?? undefined);
        onCookRecipe(suggestion);
    }

    function handlePreviewSuggestion(suggestion: AskFridgeSuggestionDTO) {
        onPreviewRecipe(suggestion);
    }

    return (
        <Modal
            animationType="slide"
            onRequestClose={onClose}
            presentationStyle="overFullScreen"
            statusBarTranslucent
            transparent
            visible={visible}
        >
            <View style={styles.backdrop}>
                <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />

                <View style={styles.sheet}>
                    <ImageBackground
                        source={{ uri: ASK_FRIDGE_BACKGROUND_IMAGE }}
                        style={StyleSheet.absoluteFill}
                        imageStyle={styles.sheetBackgroundImage}
                    >
                        <LinearGradient
                            colors={[
                                'rgba(4, 10, 5, 0.58)',
                                'rgba(4, 10, 5, 0.82)',
                                'rgba(4, 10, 5, 0.94)',
                                'rgba(4, 10, 5, 0.98)',
                            ]}
                            locations={[0, 0.24, 0.62, 1]}
                            style={StyleSheet.absoluteFill}
                        />
                    </ImageBackground>

                    <LinearGradient
                        colors={['rgba(9, 18, 10, 0.22)', 'rgba(9, 18, 10, 0)']}
                        pointerEvents="none"
                        style={styles.sheetGlow}
                    />

                    <View style={styles.grabber} />

                    <View style={styles.header}>
                        <Pressable onPress={Keyboard.dismiss} style={styles.headerCopy}>
                            <View style={styles.headerBadge}>
                                <MaterialCommunityIcons color={palette.primary} name="chef-hat" size={14} />
                                <Text style={styles.headerBadgeText}>{t('askFridgeEntryCta')}</Text>
                            </View>
                            <Text style={styles.headerTitle}>{t('askFridge')}</Text>
                            <Text style={styles.headerBody}>{t('askFridgeBody')}</Text>
                        </Pressable>

                        <View style={styles.headerButtons}>
                            {hasSavedConversation ? (
                                <Pressable
                                    accessibilityLabel={t('askFridgeClear')}
                                    accessibilityRole="button"
                                    onPress={() => {
                                        clearSession();
                                        resetAskFridgeMutation();
                                        setPrompt('');
                                        Keyboard.dismiss();
                                    }}
                                    style={styles.clearButton}
                                >
                                    <MaterialCommunityIcons color={palette.textPrimary} name="broom" size={18} />
                                </Pressable>
                            ) : null}

                            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                                <MaterialCommunityIcons color={palette.textPrimary} name="close" size={20} />
                            </Pressable>
                        </View>
                    </View>

                    <ScrollView
                        contentContainerStyle={[
                            styles.scrollContent,
                            {
                                paddingBottom: 152 + insets.bottom + keyboardInset,
                            },
                        ]}
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                        keyboardShouldPersistTaps="handled"
                        onScrollBeginDrag={Keyboard.dismiss}
                        ref={scrollRef}
                        showsVerticalScrollIndicator={false}
                    >
                        {!lastSubmittedPrompt && !askFridgeMutation.isPending && suggestions.length === 0 ? (
                            <View style={styles.heroCard}>
                                <Text style={styles.heroEyebrow}>{t('askFridgeType')}</Text>
                                <Text style={styles.heroTitle}>{t('askFridgeListeningTitle')}</Text>
                                <Text style={styles.heroBody}>{t('askFridgeListeningBody')}</Text>

                                <View style={styles.heroPromptRow}>
                                    {quickPrompts.slice(0, 3).map((chip) => (
                                        <Pressable
                                            key={chip}
                                            accessibilityRole="button"
                                            onPress={() => setPrompt(chip)}
                                            style={styles.heroPromptChip}
                                        >
                                            <Text style={styles.heroPromptChipText}>{chip}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        ) : null}

                        {lastSubmittedPrompt ? (
                            <View style={styles.chatBubbleUserWrap}>
                                <View style={[styles.chatBubble, styles.chatBubbleUser]}>
                                    <Text style={styles.chatBubbleUserLabel}>{t('askFridgeType')}</Text>
                                    <Text style={styles.chatBubbleUserText}>{lastSubmittedPrompt}</Text>
                                </View>
                            </View>
                        ) : null}

                        {askFridgeMutation.isPending ? (
                            <View style={[styles.chatBubble, styles.chatBubbleAi, styles.thinkingBubble]}>
                                <Text style={styles.chatBubbleAiLabel}>{t('askFridge')}</Text>
                                <Text style={styles.chatBubbleAiText}>
                                    {suggestions.length > 0 ? t('askFridgeThinkingB') : t('askFridgeThinkingA')}
                                </Text>
                            </View>
                        ) : null}

                        {askFridgeMutation.isError ? (
                            <View style={[styles.chatBubble, styles.chatBubbleAi, styles.errorBubble]}>
                                <Text style={styles.chatBubbleAiLabel}>{t('askFridge')}</Text>
                                <Text style={styles.chatBubbleAiText}>{t('askFridgeError')}</Text>
                            </View>
                        ) : null}

                        {localAssistantMessage ? (
                            <View style={[styles.chatBubble, styles.chatBubbleAi]}>
                                <Text style={styles.chatBubbleAiLabel}>{t('askFridge')}</Text>
                                <Text style={styles.chatBubbleAiText}>{localAssistantMessage}</Text>
                            </View>
                        ) : null}

                        {suggestions.length > 0 ? (
                            <Text style={styles.sectionLabel}>{t('askFridgeResults')}</Text>
                        ) : null}

                        {suggestions.map((suggestion) => (
                            <View key={suggestion.recipe.id} style={styles.card}>
                                <ImageBackground
                                    imageStyle={styles.cardHeroImage}
                                    resizeMode="cover"
                                    source={suggestion.image?.url ? { uri: suggestion.image.url } : undefined}
                                    style={styles.cardHero}
                                >
                                    <LinearGradient
                                        colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.82)']}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <View style={styles.cardTag}>
                                        <Text style={styles.cardTagText}>{suggestion.fitLabel}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.cardMeta}>
                                            {suggestion.recipe.totalTimeMinutes} min • {suggestion.recipe.difficulty}
                                        </Text>
                                        <Text style={styles.cardTitle}>{suggestion.recipe.title}</Text>
                                    </View>
                                </ImageBackground>

                                <View style={styles.cardBody}>
                                    <Text style={styles.cardSummary}>{suggestion.summary}</Text>
                                    <Text style={styles.cardIngredients}>
                                        {suggestion.recipe.ingredients
                                            .slice(0, 4)
                                            .map((ingredient) => ingredient.name)
                                            .join(', ')}
                                    </Text>

                                    <View style={styles.cardActions}>
                                        <Pressable
                                            accessibilityRole="button"
                                            onPress={() => handlePreviewSuggestion(suggestion)}
                                            style={styles.cardInfoButton}
                                        >
                                            <MaterialCommunityIcons
                                                color={palette.textPrimary}
                                                name="information-outline"
                                                size={18}
                                            />
                                            <Text style={styles.cardInfoButtonText}>{t('askFridgeInfo')}</Text>
                                        </Pressable>

                                        <Pressable
                                            accessibilityRole="button"
                                            onPress={() => void handleCookSuggestion(suggestion)}
                                            style={styles.cardButton}
                                        >
                                            <Text style={styles.cardButtonText}>{t('askFridgeCookThis')}</Text>
                                            <MaterialCommunityIcons color={palette.background} name="arrow-right" size={18} />
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    <View
                        style={[
                            styles.composerDock,
                            {
                                bottom: keyboardInset,
                                paddingBottom: Math.max(insets.bottom, 14),
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={['rgba(7, 26, 8, 0)', 'rgba(7, 26, 8, 0.16)', 'rgba(7, 26, 8, 0.42)']}
                            locations={[0, 0.44, 1]}
                            pointerEvents="none"
                            style={styles.composerDockFade}
                        />
                        <View style={styles.composerShell}>
                            <View style={styles.composer}>
                                <TextInput
                                    multiline
                                    onChangeText={setPrompt}
                                    placeholder={t('askFridgePromptPlaceholder')}
                                    placeholderTextColor={palette.textSecondary}
                                    style={styles.promptInput}
                                    value={prompt}
                                />

                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => void submitPrompt()}
                                    style={[styles.sendButton, composerDisabled && styles.sendButtonDisabled]}
                                >
                                    <Text style={styles.sendButtonText}>{t('askFridgeSend')}</Text>
                                    <MaterialCommunityIcons color={palette.background} name="arrow-up-right" size={18} />
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.42)',
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: palette.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        elevation: 24,
        flex: 1,
        maxHeight: '92%',
        overflow: 'hidden',
        paddingHorizontal: 18,
        paddingTop: 10,
    },
    sheetBackgroundImage: {
        opacity: 0.34,
    },
    sheetGlow: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: 220,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    grabber: {
        alignSelf: 'center',
        backgroundColor: 'rgba(243, 248, 242, 0.24)',
        borderRadius: 999,
        height: 5,
        marginBottom: 14,
        width: 52,
    },
    header: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    headerCopy: {
        flex: 1,
        paddingRight: 16,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    headerBadge: {
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: palette.primarySoft,
        borderRadius: 999,
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    headerBadgeText: {
        color: palette.primary,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    headerTitle: {
        color: palette.textPrimary,
        fontSize: 28,
        fontWeight: '900',
    },
    headerBody: {
        color: palette.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 6,
        maxWidth: 280,
    },
    closeButton: {
        alignItems: 'center',
        backgroundColor: palette.primarySoft,
        borderRadius: 999,
        height: 38,
        justifyContent: 'center',
        width: 38,
    },
    clearButton: {
        alignItems: 'center',
        backgroundColor: palette.surfaceElevated,
        borderColor: palette.outlineStrong,
        borderRadius: 999,
        borderWidth: 1,
        height: 38,
        justifyContent: 'center',
        width: 38,
    },
    scrollContent: {
        paddingTop: 18,
    },
    heroCard: {
        backgroundColor: '#102612',
        borderColor: 'rgba(170, 226, 118, 0.2)',
        borderRadius: 28,
        borderWidth: 1,
        marginBottom: 18,
        padding: 20,
    },
    heroEyebrow: {
        color: palette.primary,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    heroTitle: {
        color: palette.textPrimary,
        fontSize: 24,
        fontWeight: '900',
        lineHeight: 30,
        marginTop: 10,
    },
    heroBody: {
        color: palette.textSecondary,
        fontSize: 14,
        lineHeight: 21,
        marginTop: 8,
    },
    heroPromptRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 16,
    },
    heroPromptChip: {
        backgroundColor: 'rgba(243, 248, 242, 0.06)',
        borderColor: 'rgba(243, 248, 242, 0.12)',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    heroPromptChipText: {
        color: palette.textPrimary,
        fontSize: 12,
        fontWeight: '800',
    },
    chatBubble: {
        borderRadius: 24,
        marginBottom: 14,
        maxWidth: '88%',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    chatBubbleAi: {
        alignSelf: 'flex-start',
        backgroundColor: palette.surfaceElevated,
        borderColor: palette.outlineStrong,
        borderWidth: 1,
    },
    chatBubbleAiLabel: {
        color: palette.primary,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.8,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    chatBubbleAiText: {
        color: palette.textPrimary,
        fontSize: 14,
        lineHeight: 21,
    },
    chatBubbleUserWrap: {
        alignItems: 'flex-end',
        width: '100%',
    },
    chatBubbleUser: {
        alignSelf: 'flex-end',
        backgroundColor: '#DFF0B3',
        minWidth: '52%',
    },
    chatBubbleUserLabel: {
        color: '#395200',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.8,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    chatBubbleUserText: {
        color: palette.background,
        fontSize: 14,
        fontWeight: '800',
        lineHeight: 21,
    },
    thinkingBubble: {
        borderColor: palette.primaryBorder,
    },
    errorBubble: {
        borderColor: palette.danger,
    },
    sectionLabel: {
        color: palette.primary,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 10,
        marginTop: 8,
        textTransform: 'uppercase',
    },
    card: {
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 26,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardHero: {
        height: 188,
        justifyContent: 'space-between',
        padding: 18,
    },
    cardHeroImage: {
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
    },
    cardTag: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(7, 26, 8, 0.72)',
        borderColor: palette.outlineStrong,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    cardTagText: {
        color: palette.textPrimary,
        fontSize: 11,
        fontWeight: '800',
    },
    cardMeta: {
        color: 'rgba(243, 248, 242, 0.78)',
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 6,
    },
    cardTitle: {
        color: palette.textPrimary,
        fontSize: 26,
        fontWeight: '900',
        lineHeight: 30,
    },
    cardBody: {
        padding: 18,
    },
    cardSummary: {
        color: palette.textPrimary,
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 22,
    },
    cardIngredients: {
        color: palette.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        marginTop: 10,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    cardInfoButton: {
        alignItems: 'center',
        backgroundColor: palette.surfaceElevated,
        borderColor: palette.outlineStrong,
        borderRadius: 18,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 13,
    },
    cardInfoButtonText: {
        color: palette.textPrimary,
        fontSize: 13,
        fontWeight: '900',
    },
    cardButton: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 18,
        flex: 1,
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    cardButtonText: {
        color: palette.background,
        fontSize: 14,
        fontWeight: '900',
    },
    composerDock: {
        backgroundColor: 'transparent',
        left: -18,
        paddingHorizontal: 18,
        paddingTop: 14,
        position: 'absolute',
        right: -18,
    },
    composerDockFade: {
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: -18,
    },
    composerShell: {
        gap: 0,
    },
    composer: {
        alignItems: 'flex-end',
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 26,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 12,
        padding: 12,
    },
    promptInput: {
        color: palette.textPrimary,
        flex: 1,
        fontSize: 15,
        lineHeight: 22,
        maxHeight: 104,
        minHeight: 52,
        paddingTop: 4,
        textAlignVertical: 'top',
    },
    sendButton: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 16,
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    sendButtonDisabled: {
        opacity: 0.72,
    },
    sendButtonText: {
        color: palette.background,
        fontSize: 14,
        fontWeight: '900',
    },
});
