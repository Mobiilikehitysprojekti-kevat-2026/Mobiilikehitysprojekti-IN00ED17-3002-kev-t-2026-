import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ImageBackground,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useDailyRecipesQuery } from '../api/useDailyRecipesQuery';
import { AppBottomNav } from '../components/molecules/AppBottomNav';
import { AskFridgeModal } from '../components/organisms/AskFridgeModal';
import { resolveSupportedLocale } from '../i18n';
import type { RootStackParamList } from '../navigation/types';
import { recipeRepository } from '../repositories/RecipeRepository';
import { useAppShellStore } from '../store';
import { palette } from '../theme/colors';
import type { AskFridgeSuggestionDTO, DailyRecipeItemDTO, Locale, RecipeDTO, SavedRecipeRecord } from '../types/api';

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'RecipesHub'>;

const ASK_FRIDGE_CARD_BACKGROUND_IMAGE =
    'https://images.pexels.com/photos/14930081/pexels-photo-14930081.jpeg?cs=srgb&dl=pexels-merve-205352359-14930081.jpg&fm=jpg';

function recipeSubtitle(recipe: RecipeDTO) {
    return `${recipe.totalTimeMinutes} min • ${recipe.difficulty}`;
}

function SaveBadge({
    onPress,
    saved,
}: {
    onPress: () => void;
    saved: boolean;
}) {
    return (
        <Pressable accessibilityRole="button" onPress={onPress} style={styles.saveButton}>
            <MaterialCommunityIcons
                color={saved ? palette.primary : palette.textPrimary}
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={22}
            />
        </Pressable>
    );
}

function EmptyState({
    body,
    ctaLabel,
    iconName,
    onPress,
    title,
}: {
    body: string;
    ctaLabel: string;
    iconName: ComponentProps<typeof MaterialCommunityIcons>['name'];
    onPress: () => void;
    title: string;
}) {
    return (
        <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
                <MaterialCommunityIcons color={palette.primary} name={iconName} size={28} />
            </View>
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptyBody}>{body}</Text>
            <Pressable accessibilityRole="button" onPress={onPress} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>{ctaLabel}</Text>
            </Pressable>
        </View>
    );
}

const RecipeCard = memo(function RecipeCard({
    description,
    image,
    onPress,
    onToggleSave,
    photoCreditLabel,
    recipe,
    saved,
    tag,
    viewRecipeLabel,
}: {
    description?: string;
    image?: DailyRecipeItemDTO['image'] | { url?: string | null } | null;
    onPress: () => void;
    onToggleSave: () => void;
    photoCreditLabel?: string;
    recipe: RecipeDTO;
    saved: boolean;
    tag: string;
    viewRecipeLabel: string;
}) {
    return (
        <View style={styles.card}>
            <Pressable accessibilityRole="button" onPress={onPress}>
                <ImageBackground source={image?.url ? { uri: image.url } : undefined} style={styles.cardHero}>
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.72)']}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.cardTopRow}>
                        <View style={styles.cardTag}>
                            <Text style={styles.cardTagText}>{tag}</Text>
                        </View>
                        <SaveBadge onPress={onToggleSave} saved={saved} />
                    </View>
                    <View>
                        <Text style={styles.cardHeroMeta}>{recipeSubtitle(recipe)}</Text>
                        {image && 'photographerName' in image && image.photographerName ? (
                            <Text style={styles.cardPhotoCredit}>{photoCreditLabel}</Text>
                        ) : null}
                    </View>
                </ImageBackground>
            </Pressable>

            <View style={styles.cardBody}>
                <Pressable accessibilityRole="button" onPress={onPress}>
                    <Text style={styles.cardTitle}>{recipe.title}</Text>
                    <Text style={styles.cardDescription}>
                        {description ??
                            recipe.ingredients.slice(0, 3).map((ingredient) => ingredient.name).join(', ')}
                    </Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={onPress} style={styles.cardButton}>
                    <Text style={styles.cardButtonText}>{viewRecipeLabel}</Text>
                </Pressable>
            </View>
        </View>
    );
});

const SavedCollectionCard = memo(function SavedCollectionCard({
    onPress,
    onToggleSave,
    record,
    savedBadgeLabel,
}: {
    onPress: () => void;
    onToggleSave: () => void;
    record: SavedRecipeRecord;
    savedBadgeLabel: string;
}) {
    return (
        <Pressable accessibilityRole="button" onPress={onPress} style={styles.savedCard}>
            <ImageBackground
                source={record.imageUri ? { uri: record.imageUri } : undefined}
                style={styles.savedCardHero}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.savedCardTopRow}>
                    <View style={styles.savedCardTag}>
                        <Text style={styles.savedCardTagText}>{savedBadgeLabel}</Text>
                    </View>
                    <SaveBadge onPress={onToggleSave} saved />
                </View>

                <View style={styles.savedCardFooter}>
                    <Text numberOfLines={2} style={styles.savedCardTitle}>
                        {record.recipe.title}
                    </Text>
                    <Text style={styles.savedCardMeta}>{recipeSubtitle(record.recipe)}</Text>
                </View>
            </ImageBackground>
        </Pressable>
    );
});

const DailyLoadingShell = memo(function DailyLoadingShell({ title }: { title: string }) {
    return (
        <View>
            <Text style={styles.sectionLabel}>{title}</Text>
            {[0, 1, 2].map((item) => (
                <View key={`daily-loading-${item}`} style={styles.loadingCard}>
                    <View style={styles.loadingHero} />
                    <View style={styles.loadingBody}>
                        <View style={styles.loadingTitle} />
                        <View style={styles.loadingLine} />
                        <View style={[styles.loadingLine, styles.loadingLineShort]} />
                    </View>
                </View>
            ))}
        </View>
    );
});

const HighlightsCarousel = memo(function HighlightsCarousel({
    items,
    onOpenRecipe,
    onToggleSave,
    photoCreditLabel,
    savedRecipeIds,
    title,
}: {
    items: DailyRecipeItemDTO[];
    onOpenRecipe: (item: DailyRecipeItemDTO) => void;
    onToggleSave: (item: DailyRecipeItemDTO) => void;
    photoCreditLabel: (item: DailyRecipeItemDTO) => string | undefined;
    savedRecipeIds: string[];
    title: string;
}) {
    const { width } = useWindowDimensions();
    const scrollRef = useRef<ScrollView | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const highlightItems = useMemo(() => items.slice(0, 5), [items]);
    const cardWidth = Math.min(Math.max(width - 54, 280), 360);
    const snapInterval = cardWidth + 14;

    useEffect(() => {
        if (highlightItems.length <= 1) {
            return;
        }

        const timer = setInterval(() => {
            setActiveIndex((current) => {
                const nextIndex = (current + 1) % highlightItems.length;
                scrollRef.current?.scrollTo({
                    animated: true,
                    x: nextIndex * snapInterval,
                    y: 0,
                });
                return nextIndex;
            });
        }, 3600);

        return () => {
            clearInterval(timer);
        };
    }, [highlightItems.length, snapInterval]);

    const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
        setActiveIndex(Math.max(0, Math.min(nextIndex, highlightItems.length - 1)));
    };

    return (
        <View>
            <Text style={styles.sectionLabel}>{title}</Text>
            <ScrollView
                contentContainerStyle={styles.highlightSlider}
                horizontal
                onMomentumScrollEnd={handleMomentumEnd}
                ref={scrollRef}
                showsHorizontalScrollIndicator={false}
            >
                {highlightItems.map((item) => {
                    const saved = savedRecipeIds.includes(item.recipe.id);

                    return (
                        <Pressable
                            key={`highlight-${item.recipe.id}`}
                            accessibilityRole="button"
                            onPress={() => onOpenRecipe(item)}
                            style={[styles.highlightCard, { width: cardWidth }]}
                        >
                            <ImageBackground
                                source={item.image?.url ? { uri: item.image.url } : undefined}
                                style={styles.highlightHero}
                            >
                                <LinearGradient
                                    colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.75)']}
                                    style={StyleSheet.absoluteFill}
                                />

                                <View style={styles.highlightTopRow}>
                                    <View style={styles.highlightTag}>
                                        <Text style={styles.highlightTagText}>{recipeSubtitle(item.recipe)}</Text>
                                    </View>
                                    <SaveBadge onPress={() => onToggleSave(item)} saved={saved} />
                                </View>

                                <View>
                                    <Text numberOfLines={2} style={styles.highlightTitle}>
                                        {item.recipe.title}
                                    </Text>
                                    <Text numberOfLines={2} style={styles.highlightDescription}>
                                        {item.recipe.ingredients
                                            .slice(0, 4)
                                            .map((ingredient) => ingredient.name)
                                            .join(', ')}
                                    </Text>
                                    {photoCreditLabel(item) ? (
                                        <Text style={styles.highlightCredit}>{photoCreditLabel(item)}</Text>
                                    ) : null}
                                </View>
                            </ImageBackground>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <View style={styles.highlightDots}>
                {highlightItems.map((item, index) => (
                    <View
                        key={`dot-${item.recipe.id}`}
                        style={[styles.highlightDot, index === activeIndex && styles.highlightDotActive]}
                    />
                ))}
            </View>
        </View>
    );
});

export function RecipesHubScreen({ navigation }: ScreenProps) {
    const { t, i18n } = useTranslation();
    const latestAnalysis = useAppShellStore((state) => state.latestAnalysis);
    const pantryIngredients = useAppShellStore((state) => state.pantryIngredients);
    const selectedIngredients = useAppShellStore((state) => state.selectedIngredients);
    const sourceImageUri = useAppShellStore((state) => state.sourceImageUri);
    const [savedRecords, setSavedRecords] = useState<SavedRecipeRecord[]>([]);
    const [isAskFridgeOpen, setIsAskFridgeOpen] = useState(false);
    const dailyFeedTransition = useRef(new Animated.Value(1)).current;
    const lastDailySlotRef = useRef<string | null>(null);
    const reopenAskFridgeOnFocusRef = useRef(false);

    const loadSavedRecords = useCallback(async () => {
        const records = await recipeRepository.findAllRecords();
        setSavedRecords(records);
    }, []);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;

            if (reopenAskFridgeOnFocusRef.current) {
                reopenAskFridgeOnFocusRef.current = false;
                setIsAskFridgeOpen(true);
            }

            void (async () => {
                const records = await recipeRepository.findAllRecords();
                if (!cancelled) {
                    setSavedRecords(records);
                }
            })();

            return () => {
                cancelled = true;
            };
        }, []),
    );

    const handleToggleSave = useCallback(
        async (recipe: RecipeDTO, imageUri?: string | null) => {
            const isSaved = savedRecords.some((record) => record.recipe.id === recipe.id);

            if (isSaved) {
                await recipeRepository.delete(recipe.id);
            } else {
                await recipeRepository.save(recipe, imageUri ?? undefined);
            }

            await loadSavedRecords();
        },
        [loadSavedRecords, savedRecords],
    );

    const isSavedRecipe = useCallback(
        (recipeId: string) => savedRecords.some((record) => record.recipe.id === recipeId),
        [savedRecords],
    );

    const latestRecipe = latestAnalysis?.suggestedRecipe ?? null;
    const fallbackIngredients =
        pantryIngredients.length > 0
            ? pantryIngredients
            : selectedIngredients.length > 0
                ? selectedIngredients
                : latestAnalysis?.detectedIngredients ?? [];
    const dailyRecipesQuery = useDailyRecipesQuery({
        ingredients: fallbackIngredients.map((ingredient) => ingredient.name),
        locale: resolveSupportedLocale(i18n.language) as Locale,
    });
    const dailyItems = dailyRecipesQuery.data?.items ?? [];
    const dailySlotStart = dailyRecipesQuery.data?.slotStart ?? null;
    const savedRecipeIds = useMemo(
        () => savedRecords.map((record) => record.recipe.id),
        [savedRecords],
    );

    useEffect(() => {
        if (!dailySlotStart) {
            return;
        }

        if (lastDailySlotRef.current === null) {
            lastDailySlotRef.current = dailySlotStart;
            return;
        }

        if (lastDailySlotRef.current === dailySlotStart) {
            return;
        }

        lastDailySlotRef.current = dailySlotStart;
        dailyFeedTransition.setValue(0);
        Animated.spring(dailyFeedTransition, {
            damping: 16,
            mass: 0.85,
            stiffness: 170,
            toValue: 1,
            useNativeDriver: true,
        }).start();
    }, [dailyFeedTransition, dailySlotStart]);

    const openRecipe = useCallback((recipe: RecipeDTO, sourceImage?: string | null) => {
        navigation.navigate('Recipe', {
            availableIngredients: fallbackIngredients,
            recipe,
            sourceImageUri: sourceImage ?? undefined,
        });
    }, [fallbackIngredients, navigation]);
    const openAskFridge = useCallback(() => {
        reopenAskFridgeOnFocusRef.current = false;
        setIsAskFridgeOpen(true);
    }, []);
    const openAskFridgeSuggestion = useCallback((suggestion: AskFridgeSuggestionDTO) => {
        reopenAskFridgeOnFocusRef.current = false;
        setIsAskFridgeOpen(false);
        openRecipe(suggestion.recipe, suggestion.image?.url);
    }, [openRecipe]);
    const previewAskFridgeSuggestion = useCallback((suggestion: AskFridgeSuggestionDTO) => {
        reopenAskFridgeOnFocusRef.current = true;
        setIsAskFridgeOpen(false);
        openRecipe(suggestion.recipe, suggestion.image?.url);
    }, [openRecipe]);
    const photoCreditLabel = useCallback(
        (item: DailyRecipeItemDTO) =>
            item.image?.photographerName
                ? t('photoCredit', { name: item.image.photographerName })
                : undefined,
        [t],
    );

    return (
        <LinearGradient colors={[palette.background, '#081408']} style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View style={styles.headerBadge}>
                            <MaterialCommunityIcons color={palette.primary} name="chef-hat" size={22} />
                        </View>
                        <View style={styles.headerCopy}>
                            <Text style={styles.headerTitle}>{t('appName')}</Text>
                            <Text style={styles.headerSubtitle}>{t('recipesHubSubtitle')}</Text>
                        </View>
                        <View style={styles.headerActions}>
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => navigation.navigate('Settings')}
                                style={styles.headerActionButton}
                            >
                                <MaterialCommunityIcons color={palette.textPrimary} name="cog-outline" size={24} />
                            </Pressable>
                        </View>
                    </View>

                    <Text style={styles.heroSubtitle}>{t('recipesHeroSubtitle')}</Text>

                    <Pressable
                        accessibilityRole="button"
                        onPress={openAskFridge}
                        style={styles.askFridgeCard}
                    >
                        <ImageBackground
                            source={{ uri: ASK_FRIDGE_CARD_BACKGROUND_IMAGE }}
                            style={styles.askFridgeCardBackground}
                            imageStyle={styles.askFridgeCardBackgroundImage}
                        >
                            <LinearGradient
                                colors={[
                                    'rgba(4, 10, 5, 0.42)',
                                    'rgba(4, 10, 5, 0.76)',
                                    'rgba(4, 10, 5, 0.92)',
                                ]}
                                locations={[0, 0.48, 1]}
                                style={StyleSheet.absoluteFill}
                            />

                            <View style={styles.askFridgeOrb}>
                                <MaterialCommunityIcons color={palette.primary} name="robot-happy-outline" size={28} />
                            </View>
                            <View style={styles.askFridgeCopy}>
                                <Text style={styles.askFridgeTitle}>{t('askFridge')}</Text>
                                <Text style={styles.askFridgeBody}>{t('askFridgeBody')}</Text>
                            </View>
                            <View style={styles.askFridgeActions}>
                                <Pressable
                                    accessibilityRole="button"
                                    hitSlop={8}
                                    onPress={(event) => {
                                        event.stopPropagation();
                                        openAskFridge();
                                    }}
                                    style={[styles.askFridgePill, styles.askFridgePillPrimary]}
                                >
                                    <MaterialCommunityIcons color={palette.background} name="message-text-outline" size={16} />
                                    <Text style={[styles.askFridgePillText, styles.askFridgePillTextPrimary]}>
                                        {t('askFridgeEntryCta')}
                                    </Text>
                                </Pressable>
                            </View>
                        </ImageBackground>
                    </Pressable>

                    <Text style={styles.sectionLabel}>{t('savedCollection')}</Text>
                    <Text style={styles.savedCollectionLead}>{t('savedRecipeSummary')}</Text>
                    {savedRecords.length === 0 ? (
                        <EmptyState
                            body={t('noSavedRecipes')}
                            ctaLabel={t('startNewScan')}
                            iconName="bookmark-outline"
                            onPress={() => navigation.navigate('Camera')}
                            title={t('savedRecipes')}
                        />
                    ) : (
                        <ScrollView
                            contentContainerStyle={styles.savedSlider}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                        >
                            {savedRecords.map((record) => (
                                <SavedCollectionCard
                                    key={record.recipe.id}
                                    onPress={() => openRecipe(record.recipe, record.imageUri)}
                                    onToggleSave={() => void handleToggleSave(record.recipe, record.imageUri)}
                                    record={record}
                                    savedBadgeLabel={t('savedBadge')}
                                />
                            ))}
                        </ScrollView>
                    )}

                    <Animated.View
                        style={{
                            opacity: dailyFeedTransition,
                            transform: [
                                {
                                    translateY: dailyFeedTransition.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [18, 0],
                                    }),
                                },
                                {
                                    scale: dailyFeedTransition.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.985, 1],
                                    }),
                                },
                            ],
                        }}
                    >
                        {dailyItems.length ? (
                            <HighlightsCarousel
                                items={dailyItems}
                                onOpenRecipe={(item) => openRecipe(item.recipe, item.image?.url)}
                                onToggleSave={(item) => void handleToggleSave(item.recipe, item.image?.url)}
                                photoCreditLabel={photoCreditLabel}
                                savedRecipeIds={savedRecipeIds}
                                title={t('topHighlights')}
                            />
                        ) : dailyRecipesQuery.isPending ? (
                            <DailyLoadingShell title={t('topHighlights')} />
                        ) : null}

                        {dailyItems.length ? (
                            <Text style={styles.sectionLabel}>{t('todaysAiPicks')}</Text>
                        ) : null}
                        {dailyItems.length ? (
                            dailyItems.map((item, index) => (
                                <RecipeCard
                                    key={`${item.recipe.id}-${index}-${dailySlotStart ?? 'slot'}`}
                                    description={t('dailyRecipeSummary', {
                                        cuisine: item.recipe.cuisine,
                                        servings: item.recipe.servings,
                                        time: item.recipe.totalTimeMinutes,
                                    })}
                                    image={item.image}
                                    onPress={() => openRecipe(item.recipe, item.image?.url)}
                                    onToggleSave={() => void handleToggleSave(item.recipe, item.image?.url)}
                                    photoCreditLabel={photoCreditLabel(item)}
                                    recipe={item.recipe}
                                    saved={isSavedRecipe(item.recipe.id)}
                                    tag={t('dailyPick')}
                                    viewRecipeLabel={t('viewRecipe')}
                                />
                            ))
                        ) : dailyRecipesQuery.isPending ? (
                            <DailyLoadingShell title={t('todaysAiPicks')} />
                        ) : (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIcon}>
                                    <MaterialCommunityIcons color={palette.primary} name="robot-happy-outline" size={28} />
                                </View>
                                <Text style={styles.emptyTitle}>{t('dailyIdeasUnavailable')}</Text>
                                <Text style={styles.emptyBody}>
                                    {dailyRecipesQuery.isError ? t('dailyIdeasError') : t('dailyIdeasLoading')}
                                </Text>
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => void dailyRecipesQuery.refetch()}
                                    style={styles.emptyButton}
                                >
                                    <Text style={styles.emptyButtonText}>{t('tryAgain')}</Text>
                                </Pressable>
                            </View>
                        )}
                    </Animated.View>

                    {latestRecipe ? (
                        <>
                            <Text style={styles.sectionLabel}>{t('latestAiRecipe')}</Text>
                            <RecipeCard
                                description={t('latestScanSummary')}
                                image={sourceImageUri ? { url: sourceImageUri } : null}
                                onPress={() => openRecipe(latestRecipe, sourceImageUri)}
                                onToggleSave={() => void handleToggleSave(latestRecipe, sourceImageUri)}
                                recipe={latestRecipe}
                                saved={isSavedRecipe(latestRecipe.id)}
                                tag={t('aiPick')}
                                viewRecipeLabel={t('viewRecipe')}
                            />
                        </>
                    ) : null}

                </ScrollView>
            </SafeAreaView>

            <AskFridgeModal
                onClose={() => {
                    reopenAskFridgeOnFocusRef.current = false;
                    setIsAskFridgeOpen(false);
                }}
                onCookRecipe={openAskFridgeSuggestion}
                onPreviewRecipe={previewAskFridgeSuggestion}
                visible={isAskFridgeOpen}
            />

            <AppBottomNav
                activeTab="recipes"
                onPantry={() => navigation.navigate('PantryHub')}
                onRecipes={() => navigation.navigate('RecipesHub')}
                onScan={() => navigation.navigate('Camera')}
            />
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
        paddingBottom: 120,
        paddingHorizontal: 18,
        paddingTop: 10,
    },
    header: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 14,
        justifyContent: 'space-between',
    },
    headerBadge: {
        alignItems: 'center',
        backgroundColor: palette.primarySoft,
        borderRadius: 16,
        height: 48,
        justifyContent: 'center',
        width: 48,
    },
    headerCopy: {
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    headerActionButton: {
        alignItems: 'center',
        backgroundColor: palette.primarySoft,
        borderRadius: 16,
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    headerTitle: {
        color: palette.textPrimary,
        fontSize: 26,
        fontWeight: '900',
    },
    headerSubtitle: {
        color: palette.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    heroSubtitle: {
        color: palette.textSecondary,
        fontSize: 15,
        lineHeight: 22,
        marginTop: 18,
    },
    askFridgeCard: {
        borderColor: palette.primaryBorder,
        borderRadius: 28,
        borderWidth: 1,
        marginTop: 18,
        overflow: 'hidden',
    },
    askFridgeCardBackground: {
        padding: 18,
    },
    askFridgeCardBackgroundImage: {
        opacity: 0.28,
    },
    askFridgeOrb: {
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(170, 226, 118, 0.14)',
        borderColor: 'rgba(170, 226, 118, 0.18)',
        borderRadius: 18,
        borderWidth: 1,
        height: 52,
        justifyContent: 'center',
        width: 52,
    },
    askFridgeCopy: {
        marginTop: 14,
    },
    askFridgeTitle: {
        color: palette.textPrimary,
        fontSize: 24,
        fontWeight: '900',
    },
    askFridgeBody: {
        color: palette.textSecondary,
        fontSize: 15,
        lineHeight: 22,
        marginTop: 8,
    },
    askFridgeActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 18,
    },
    askFridgePill: {
        alignItems: 'center',
        backgroundColor: 'rgba(15, 31, 16, 0.74)',
        borderColor: 'rgba(243, 248, 242, 0.12)',
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    askFridgePillPrimary: {
        backgroundColor: palette.primary,
        borderColor: palette.primary,
    },
    askFridgePillText: {
        color: palette.textPrimary,
        fontSize: 13,
        fontWeight: '900',
    },
    askFridgePillTextPrimary: {
        color: palette.background,
    },
    savedCollectionLead: {
        color: palette.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 14,
        marginTop: -2,
    },
    sectionLabel: {
        color: palette.primary,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 10,
        marginTop: 24,
        textTransform: 'uppercase',
    },
    highlightSlider: {
        gap: 14,
        paddingRight: 18,
    },
    highlightCard: {
        borderColor: palette.outlineStrong,
        borderRadius: 28,
        borderWidth: 1,
        overflow: 'hidden',
    },
    highlightHero: {
        height: 214,
        justifyContent: 'space-between',
        padding: 18,
    },
    highlightTopRow: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    highlightTag: {
        backgroundColor: 'rgba(7, 26, 8, 0.72)',
        borderColor: palette.outlineStrong,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    highlightTagText: {
        color: palette.textPrimary,
        fontSize: 11,
        fontWeight: '800',
    },
    highlightTitle: {
        color: palette.textPrimary,
        fontSize: 28,
        fontWeight: '900',
        lineHeight: 32,
    },
    highlightDescription: {
        color: 'rgba(243, 248, 242, 0.82)',
        fontSize: 13,
        lineHeight: 19,
        marginTop: 10,
        maxWidth: '85%',
    },
    highlightCredit: {
        color: 'rgba(243, 248, 242, 0.66)',
        fontSize: 11,
        marginTop: 10,
    },
    highlightDots: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        marginTop: 12,
    },
    highlightDot: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 999,
        height: 8,
        width: 8,
    },
    highlightDotActive: {
        backgroundColor: palette.primary,
        width: 22,
    },
    loadingCard: {
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
    },
    loadingHero: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        height: 188,
    },
    loadingBody: {
        gap: 10,
        padding: 16,
    },
    loadingTitle: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 999,
        height: 18,
        width: '58%',
    },
    loadingLine: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 999,
        height: 12,
        width: '92%',
    },
    loadingLineShort: {
        width: '66%',
    },
    emptyState: {
        alignItems: 'center',
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 24,
        borderWidth: 1,
        padding: 22,
    },
    emptyIcon: {
        alignItems: 'center',
        backgroundColor: palette.primarySoft,
        borderRadius: 999,
        height: 56,
        justifyContent: 'center',
        width: 56,
    },
    emptyTitle: {
        color: palette.textPrimary,
        fontSize: 20,
        fontWeight: '900',
        marginTop: 18,
    },
    emptyBody: {
        color: palette.textSecondary,
        fontSize: 15,
        lineHeight: 22,
        marginTop: 8,
        textAlign: 'center',
    },
    emptyButton: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 18,
        marginTop: 18,
        paddingHorizontal: 18,
        paddingVertical: 14,
    },
    emptyButtonText: {
        color: palette.background,
        fontSize: 14,
        fontWeight: '900',
    },
    card: {
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 18,
        overflow: 'hidden',
    },
    cardHero: {
        justifyContent: 'space-between',
        minHeight: 220,
        padding: 16,
    },
    cardTopRow: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cardTag: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    cardTagText: {
        color: palette.background,
        fontSize: 11,
        fontWeight: '900',
    },
    cardHeroMeta: {
        color: palette.textPrimary,
        fontSize: 12,
        fontWeight: '700',
    },
    cardPhotoCredit: {
        color: 'rgba(243, 248, 242, 0.78)',
        fontSize: 11,
        marginTop: 6,
    },
    saveButton: {
        alignItems: 'center',
        backgroundColor: 'rgba(7, 26, 8, 0.78)',
        borderColor: palette.outlineStrong,
        borderRadius: 999,
        borderWidth: 1,
        height: 40,
        justifyContent: 'center',
        width: 40,
    },
    cardBody: {
        gap: 10,
        padding: 16,
    },
    cardTitle: {
        color: palette.textPrimary,
        fontSize: 28,
        fontWeight: '900',
        lineHeight: 34,
    },
    cardDescription: {
        color: palette.textSecondary,
        fontSize: 15,
        lineHeight: 22,
        marginTop: 8,
    },
    cardButton: {
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: palette.primary,
        borderRadius: 16,
        marginTop: 2,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    cardButtonText: {
        color: palette.background,
        fontSize: 14,
        fontWeight: '900',
    },
    savedSlider: {
        gap: 14,
        paddingBottom: 6,
        paddingRight: 18,
    },
    savedCard: {
        borderRadius: 24,
        overflow: 'hidden',
        width: 232,
    },
    savedCardHero: {
        borderColor: palette.outlineStrong,
        borderRadius: 24,
        borderWidth: 1,
        height: 180,
        justifyContent: 'space-between',
        overflow: 'hidden',
        padding: 14,
    },
    savedCardTopRow: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    savedCardTag: {
        alignItems: 'center',
        backgroundColor: 'rgba(105, 227, 16, 0.18)',
        borderColor: palette.primaryBorder,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    savedCardTagText: {
        color: palette.primary,
        fontSize: 11,
        fontWeight: '900',
    },
    savedCardFooter: {
        gap: 4,
    },
    savedCardTitle: {
        color: palette.textPrimary,
        fontSize: 18,
        fontWeight: '900',
        lineHeight: 22,
    },
    savedCardMeta: {
        color: palette.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
});
