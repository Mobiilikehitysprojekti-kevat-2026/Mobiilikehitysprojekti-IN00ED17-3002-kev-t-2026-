import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Image,
    ImageBackground,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useIngredientImagesQuery } from '../api/useIngredientImagesQuery';
import { AppBottomNav } from '../components/molecules/AppBottomNav';
import { resolveSupportedLocale } from '../i18n';
import type { RootStackParamList } from '../navigation/types';
import { useAppShellStore } from '../store';
import { palette } from '../theme/colors';
import type { IngredientCategory } from '../types/api';

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'PantryHub'>;

const PANTRY_EMPTY_BACKGROUND_IMAGE =
    'https://images.pexels.com/photos/1435907/pexels-photo-1435907.jpeg?auto=compress&cs=tinysrgb&w=1200';

export function PantryHubScreen({ navigation }: ScreenProps) {
    const { i18n, t } = useTranslation();
    const latestAnalysis = useAppShellStore((state) => state.latestAnalysis);
    const pantryIngredients = useAppShellStore((state) => state.pantryIngredients);
    const removePantryIngredient = useAppShellStore((state) => state.removePantryIngredient);
    const selectedIngredients = useAppShellStore((state) => state.selectedIngredients);
    const sourceImageUri = useAppShellStore((state) => state.sourceImageUri);
    const upsertPantryIngredient = useAppShellStore((state) => state.upsertPantryIngredient);
    const [search, setSearch] = useState('');
    const [draftName, setDraftName] = useState('');
    const [draftQuantity, setDraftQuantity] = useState('');
    const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
    const [isManualFormOpen, setIsManualFormOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<'all' | IngredientCategory>('all');
    const scrollRef = useRef<ScrollView | null>(null);
    const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
    const searchInputRef = useRef<TextInput | null>(null);
    const manualNameInputRef = useRef<TextInput | null>(null);
    const manualFormProgress = useRef(new Animated.Value(0)).current;
    const searchPanelProgress = useRef(new Animated.Value(0)).current;
    const locale = resolveSupportedLocale(i18n.resolvedLanguage);
    const categories: Array<{ id: 'all' | IngredientCategory; label: string }> = [
        { id: 'all', label: t('categoryAll') },
        { id: 'vegetable', label: t('categoryVegetables') },
        { id: 'dairy', label: t('categoryDairy') },
        { id: 'protein', label: t('categoryProteins') },
        { id: 'fruit', label: t('categoryFruits') },
    ];

    const pantryItems = pantryIngredients;

    const visibleItems = useMemo(
        () =>
            pantryItems.filter((ingredient) => {
                const matchesCategory =
                    activeCategory === 'all' ? true : ingredient.category === activeCategory;
                const matchesSearch = ingredient.name
                    .toLowerCase()
                    .includes(search.trim().toLowerCase());

                return matchesCategory && matchesSearch;
            }),
        [activeCategory, pantryItems, search],
    );
    const ingredientImagesQuery = useIngredientImagesQuery({
        locale,
        names: visibleItems.map((ingredient) => ingredient.name),
    });
    const ingredientImagesByName = useMemo(
        () =>
            new Map(
                ingredientImagesQuery.data?.items.map((item) => [
                    item.name.trim().toLowerCase(),
                    item.image ?? null,
                ]) ?? [],
            ),
        [ingredientImagesQuery.data?.items],
    );

    useEffect(() => {
        Animated.timing(manualFormProgress, {
            duration: 220,
            toValue: isManualFormOpen ? 1 : 0,
            useNativeDriver: false,
        }).start();
    }, [isManualFormOpen, manualFormProgress]);

    useEffect(() => {
        Animated.timing(searchPanelProgress, {
            duration: 220,
            toValue: isSearchOpen ? 1 : 0,
            useNativeDriver: false,
        }).start();
    }, [isSearchOpen, searchPanelProgress]);

    useEffect(() => {
        if (!isSearchOpen) {
            return;
        }

        const timer = setTimeout(() => {
            searchInputRef.current?.focus();
        }, 170);

        return () => {
            clearTimeout(timer);
        };
    }, [isSearchOpen]);

    useEffect(() => {
        if (!isManualFormOpen) {
            return;
        }

        const timer = setTimeout(() => {
            manualNameInputRef.current?.focus();
        }, 170);

        return () => {
            clearTimeout(timer);
        };
    }, [isManualFormOpen]);

    const resetDraft = () => {
        setDraftName('');
        setDraftQuantity('');
        setEditingIngredientId(null);
    };

    const closeManualForm = (reset = false) => {
        setIsManualFormOpen(false);
        if (reset) {
            resetDraft();
        }
    };

    const closeSearchPanel = (reset = false) => {
        setIsSearchOpen(false);
        if (reset) {
            setSearch('');
        }
    };

    const toggleManualForm = () => {
        if (isManualFormOpen) {
            closeManualForm(Boolean(editingIngredientId));
            return;
        }

        setIsManualFormOpen(true);
        scrollRef.current?.scrollTo({ animated: true, y: 0 });
    };

    const toggleSearchPanel = () => {
        if (isSearchOpen) {
            closeSearchPanel(true);
            return;
        }

        setIsSearchOpen(true);
    };

    const submitPantryIngredient = () => {
        const name = draftName.trim();
        const quantity = draftQuantity.trim();

        if (!name) {
            return;
        }

        const currentIngredient = pantryItems.find(
            (ingredient) => (ingredient.id ?? ingredient.name) === editingIngredientId,
        );

        upsertPantryIngredient({
            category: currentIngredient?.category ?? 'other',
            confidence: currentIngredient?.confidence ?? 1,
            id: editingIngredientId ?? `manual-${Date.now()}`,
            name,
            quantity,
        });
        resetDraft();
        setIsManualFormOpen(false);
    };

    const beginEditIngredient = (ingredientId: string) => {
        const ingredient = pantryItems.find((item) => (item.id ?? item.name) === ingredientId);
        if (!ingredient) {
            return;
        }

        setEditingIngredientId(ingredientId);
        setDraftName(ingredient.name);
        setDraftQuantity(ingredient.quantity ?? '');
        setIsManualFormOpen(true);
        scrollRef.current?.scrollTo({ animated: true, y: 0 });
        swipeableRefs.current[ingredientId]?.close();
    };

    const deleteIngredient = (ingredientId: string) => {
        removePantryIngredient(ingredientId);
        if (editingIngredientId === ingredientId) {
            closeManualForm(true);
        }
        swipeableRefs.current[ingredientId]?.close();
    };

    const manualFormHeight = manualFormProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 118],
    });
    const manualFormOpacity = manualFormProgress.interpolate({
        inputRange: [0, 0.35, 1],
        outputRange: [0, 0.45, 1],
    });
    const manualFormTranslateY = manualFormProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [-10, 0],
    });
    const manualIconRotate = manualFormProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '45deg'],
    });
    const searchPanelHeight = searchPanelProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 82],
    });
    const searchPanelOpacity = searchPanelProgress.interpolate({
        inputRange: [0, 0.35, 1],
        outputRange: [0, 0.45, 1],
    });
    const searchPanelTranslateY = searchPanelProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [-8, 0],
    });

    const renderLeftActions = (ingredientId: string) => (
        <Pressable
            accessibilityRole="button"
            onPress={() => beginEditIngredient(ingredientId)}
            style={[styles.swipeAction, styles.editAction]}
        >
            <MaterialCommunityIcons color={palette.background} name="pencil-outline" size={18} />
            <Text style={styles.swipeActionText}>{t('edit')}</Text>
        </Pressable>
    );

    const renderRightActions = (ingredientId: string) => (
        <Pressable
            accessibilityRole="button"
            onPress={() => deleteIngredient(ingredientId)}
            style={[styles.swipeAction, styles.deleteAction]}
        >
            <MaterialCommunityIcons color={palette.background} name="trash-can-outline" size={18} />
            <Text style={styles.swipeActionText}>{t('remove')}</Text>
        </Pressable>
    );

    return (
        <LinearGradient colors={[palette.background, palette.backgroundAlt]} style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    ref={scrollRef}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('RecipesHub')}>
                            <MaterialCommunityIcons color={palette.textPrimary} name="silverware-fork-knife" size={26} />
                        </Pressable>
                        <Text style={styles.headerTitle}>{t('pantry')}</Text>
                        <View style={styles.headerActions}>
                            <Pressable
                                accessibilityRole="button"
                                onPress={toggleSearchPanel}
                                style={[styles.headerIconButton, isSearchOpen && styles.headerIconButtonActive]}
                            >
                                <MaterialCommunityIcons
                                    color={isSearchOpen ? palette.background : palette.textPrimary}
                                    name={isSearchOpen ? 'close' : 'magnify'}
                                    size={20}
                                />
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                onPress={toggleManualForm}
                                style={[styles.headerIconButton, isManualFormOpen && styles.headerIconButtonActive]}
                            >
                                <Animated.View style={{ transform: [{ rotate: manualIconRotate }] }}>
                                    <MaterialCommunityIcons
                                        color={isManualFormOpen ? palette.background : palette.textPrimary}
                                        name="plus"
                                        size={20}
                                    />
                                </Animated.View>
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => navigation.navigate('Settings')}
                                style={styles.headerIconButton}
                            >
                                <MaterialCommunityIcons color={palette.textPrimary} name="cog-outline" size={20} />
                            </Pressable>
                        </View>
                    </View>

                    <Animated.View
                        pointerEvents={isSearchOpen ? 'auto' : 'none'}
                        style={[
                            styles.searchExpandWrap,
                            {
                                maxHeight: searchPanelHeight,
                                opacity: searchPanelOpacity,
                                transform: [{ translateY: searchPanelTranslateY }],
                            },
                        ]}
                    >
                        <View style={styles.searchPanel}>
                            <MaterialCommunityIcons color={palette.textSecondary} name="magnify" size={18} />
                            <TextInput
                                onChangeText={setSearch}
                                placeholder={t('pantrySearchPlaceholder', {
                                    defaultValue: 'Search your pantry',
                                })}
                                placeholderTextColor={palette.textSecondary}
                                ref={searchInputRef}
                                style={styles.searchPanelInput}
                                value={search}
                            />
                            {search ? (
                                <Pressable accessibilityRole="button" onPress={() => setSearch('')}>
                                    <MaterialCommunityIcons color={palette.textMuted} name="close-circle" size={18} />
                                </Pressable>
                            ) : null}
                        </View>
                    </Animated.View>

                    <Animated.View
                        pointerEvents={isManualFormOpen ? 'auto' : 'none'}
                        style={[
                            styles.manualExpandWrap,
                            {
                                maxHeight: manualFormHeight,
                                opacity: manualFormOpacity,
                                transform: [{ translateY: manualFormTranslateY }],
                            },
                        ]}
                    >
                        <View style={[styles.manualComposerCard, editingIngredientId && styles.manualComposerCardEditing]}>
                            <View style={styles.manualComposerRow}>
                                <TextInput
                                    onChangeText={setDraftName}
                                    onSubmitEditing={submitPantryIngredient}
                                    placeholder={t('manualIngredientPlaceholder', {
                                        defaultValue: 'Add an ingredient manually',
                                    })}
                                    placeholderTextColor={palette.textSecondary}
                                    ref={manualNameInputRef}
                                    returnKeyType="done"
                                    style={styles.manualComposerNameInput}
                                    value={draftName}
                                />

                                <View style={styles.manualComposerQuantityWrap}>
                                    <TextInput
                                        onChangeText={setDraftQuantity}
                                        onSubmitEditing={submitPantryIngredient}
                                        placeholder={t('pantryQuantityPlaceholder', {
                                            defaultValue: 'Amount',
                                        })}
                                        placeholderTextColor={palette.textSecondary}
                                        returnKeyType="done"
                                        style={styles.manualComposerQuantityInput}
                                        value={draftQuantity}
                                    />
                                </View>

                                <Pressable
                                    accessibilityRole="button"
                                    onPress={submitPantryIngredient}
                                    style={styles.manualComposerConfirm}
                                >
                                    <MaterialCommunityIcons color={palette.background} name="check" size={18} />
                                </Pressable>

                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => closeManualForm(true)}
                                    style={styles.manualComposerDismiss}
                                >
                                    <MaterialCommunityIcons color={palette.textPrimary} name="close" size={18} />
                                </Pressable>
                            </View>

                            {editingIngredientId ? (
                                <View style={styles.manualComposerBadge}>
                                    <Text style={styles.manualComposerBadgeText}>{t('edit')}</Text>
                                </View>
                            ) : null}
                        </View>
                    </Animated.View>

                    <ScrollView
                        contentContainerStyle={styles.categoryRow}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    >
                        {categories.map((category) => {
                            const active = category.id === activeCategory;
                            return (
                                <Pressable
                                    key={category.id}
                                    accessibilityRole="button"
                                    onPress={() => setActiveCategory(category.id)}
                                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                                >
                                    <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                                        {category.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    {visibleItems.length === 0 ? (
                        <View style={styles.emptyState}>
                            <ImageBackground
                                imageStyle={styles.emptyStateBackgroundImage}
                                source={{ uri: PANTRY_EMPTY_BACKGROUND_IMAGE }}
                                style={styles.emptyStateBackground}
                            >
                                <LinearGradient
                                    colors={[
                                        'rgba(7, 16, 10, 0.36)',
                                        'rgba(7, 16, 10, 0.72)',
                                        'rgba(7, 16, 10, 0.9)',
                                    ]}
                                    locations={[0, 0.52, 1]}
                                    style={StyleSheet.absoluteFill}
                                />

                                <View style={styles.emptyStateContent}>
                                    <MaterialCommunityIcons color={palette.primary} name="fridge-outline" size={34} />
                                    <Text style={styles.emptyTitle}>{t('noPantryItems')}</Text>
                                    <Text style={styles.emptyBody}>{t('scanToBuildPantry')}</Text>
                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={() => navigation.navigate('Camera')}
                                        style={styles.primaryButton}
                                    >
                                        <Text style={styles.primaryButtonText}>{t('scan')}</Text>
                                    </Pressable>
                                </View>
                            </ImageBackground>
                        </View>
                    ) : (
                        <>
                            {visibleItems.map((ingredient, index) => {
                                const ingredientId = ingredient.id ?? `${ingredient.name}-${index}`;
                                const ingredientImage = ingredientImagesByName.get(
                                    ingredient.name.trim().toLowerCase(),
                                );

                                return (
                                    <Swipeable
                                        key={ingredientId}
                                        friction={1.8}
                                        leftThreshold={28}
                                        overshootLeft={false}
                                        overshootRight={false}
                                        ref={(instance) => {
                                            swipeableRefs.current[ingredientId] = instance;
                                        }}
                                        renderLeftActions={() => renderLeftActions(ingredientId)}
                                        renderRightActions={() => renderRightActions(ingredientId)}
                                        rightThreshold={28}
                                    >
                                        <View style={styles.ingredientCard}>
                                            <View style={styles.ingredientMedia}>
                                                {ingredientImage?.url ? (
                                                    <Image source={{ uri: ingredientImage.url }} style={styles.ingredientImage} />
                                                ) : (
                                                    <View style={styles.ingredientIcon}>
                                                        <MaterialCommunityIcons
                                                            color={ingredient.confidence < 0.5 ? palette.warning : palette.primary}
                                                            name={ingredient.confidence < 0.5 ? 'alert-circle' : 'check-circle'}
                                                            size={24}
                                                        />
                                                    </View>
                                                )}
                                            </View>
                                            <View style={styles.ingredientCopy}>
                                                <Text style={styles.ingredientTitle}>{ingredient.name}</Text>
                                                <Text style={styles.ingredientMeta}>
                                                    {t(
                                                        `category${ingredient.category.charAt(0).toUpperCase()}${ingredient.category.slice(1)}`,
                                                    )}
                                                    {ingredient.quantity ? ` • ${ingredient.quantity}` : ''}
                                                </Text>
                                            </View>
                                            <Text style={styles.ingredientConfidence}>
                                                {Math.round(ingredient.confidence * 100)}%
                                            </Text>
                                        </View>
                                    </Swipeable>
                                );
                            })}

                            {latestAnalysis ? (
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() =>
                                        navigation.navigate('MealSuggestions', {
                                            analysis: latestAnalysis,
                                            selectedIngredients:
                                                selectedIngredients.length > 0
                                                    ? selectedIngredients
                                                    : latestAnalysis.detectedIngredients,
                                            sourceImageUri: sourceImageUri ?? '',
                                        })
                                    }
                                    style={styles.ctaCard}
                                >
                                    <View style={styles.ctaIcon}>
                                        <MaterialCommunityIcons color={palette.background} name="chef-hat" size={22} />
                                    </View>
                                    <View style={styles.ctaCopy}>
                                        <Text style={styles.ctaTitle}>{t('readyToCook')}</Text>
                                        <Text style={styles.ctaBody}>{t('openLatestSuggestions')}</Text>
                                    </View>
                                    <MaterialCommunityIcons
                                        color={palette.primary}
                                        name="chevron-right"
                                        size={26}
                                    />
                                </Pressable>
                            ) : null}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>

            <AppBottomNav
                activeTab="pantry"
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
        justifyContent: 'space-between',
    },
    headerTitle: {
        color: palette.textPrimary,
        fontSize: 24,
        fontWeight: '900',
    },
    headerActions: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    headerIconButton: {
        alignItems: 'center',
        backgroundColor: palette.primarySoft,
        borderRadius: 999,
        height: 34,
        justifyContent: 'center',
        width: 34,
    },
    headerIconButtonActive: {
        backgroundColor: palette.primary,
    },
    searchInput: {
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 20,
        borderWidth: 1,
        color: palette.textPrimary,
        fontSize: 15,
        marginTop: 18,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    searchExpandWrap: {
        overflow: 'hidden',
    },
    searchPanel: {
        alignItems: 'center',
        backgroundColor: palette.surfaceElevated,
        borderColor: palette.outlineStrong,
        borderRadius: 22,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    searchPanelInput: {
        color: palette.textPrimary,
        flex: 1,
        fontSize: 15,
        paddingVertical: 0,
    },
    manualExpandWrap: {
        overflow: 'hidden',
    },
    manualComposerCard: {
        backgroundColor: palette.surfaceElevated,
        borderColor: palette.outlineStrong,
        borderRadius: 24,
        borderWidth: 1,
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    manualComposerCardEditing: {
        borderColor: palette.warning,
        shadowColor: palette.warning,
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.14,
        shadowRadius: 16,
    },
    manualComposerRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    manualComposerNameInput: {
        color: palette.textPrimary,
        flex: 1,
        fontSize: 15,
        paddingHorizontal: 6,
        paddingVertical: 0,
    },
    manualComposerQuantityWrap: {
        alignItems: 'center',
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 999,
        borderWidth: 1,
        minWidth: 82,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    manualComposerQuantityInput: {
        color: palette.textPrimary,
        fontSize: 14,
        minWidth: 48,
        paddingVertical: 0,
        textAlign: 'center',
    },
    manualComposerConfirm: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 999,
        height: 36,
        justifyContent: 'center',
        width: 36,
    },
    manualComposerDismiss: {
        alignItems: 'center',
        backgroundColor: palette.surfaceMuted,
        borderRadius: 999,
        height: 36,
        justifyContent: 'center',
        width: 36,
    },
    manualComposerBadge: {
        alignSelf: 'flex-start',
        backgroundColor: palette.warning,
        borderRadius: 999,
        marginLeft: 6,
        marginTop: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    manualComposerBadgeText: {
        color: palette.background,
        fontSize: 11,
        fontWeight: '900',
    },
    categoryRow: {
        gap: 10,
        paddingVertical: 18,
    },
    categoryChip: {
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    categoryChipActive: {
        backgroundColor: palette.primary,
    },
    categoryChipText: {
        color: palette.textPrimary,
        fontSize: 13,
        fontWeight: '700',
    },
    categoryChipTextActive: {
        color: palette.background,
    },
    emptyState: {
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 24,
        borderWidth: 1,
        marginTop: 8,
        overflow: 'hidden',
    },
    emptyStateBackground: {
        minHeight: 228,
    },
    emptyStateBackgroundImage: {
        opacity: 0.48,
    },
    emptyStateContent: {
        alignItems: 'center',
        minHeight: 228,
        padding: 24,
        justifyContent: 'center',
    },
    emptyTitle: {
        color: palette.textPrimary,
        fontSize: 18,
        fontWeight: '900',
        marginTop: 14,
    },
    emptyBody: {
        color: palette.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 8,
        textAlign: 'center',
    },
    primaryButton: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 16,
        marginTop: 16,
        paddingHorizontal: 18,
        paddingVertical: 12,
    },
    primaryButtonText: {
        color: palette.background,
        fontSize: 14,
        fontWeight: '900',
    },
    ingredientCard: {
        alignItems: 'center',
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 22,
        borderWidth: 1,
        flexDirection: 'row',
        marginBottom: 12,
        padding: 16,
    },
    ingredientMedia: {
        marginRight: 14,
    },
    ingredientImage: {
        backgroundColor: palette.surfaceMuted,
        borderRadius: 16,
        height: 56,
        width: 56,
    },
    ingredientIcon: {
        alignItems: 'center',
        backgroundColor: palette.primarySoft,
        borderRadius: 16,
        height: 56,
        justifyContent: 'center',
        width: 56,
    },
    ingredientCopy: {
        flex: 1,
    },
    ingredientTitle: {
        color: palette.textPrimary,
        fontSize: 16,
        fontWeight: '900',
    },
    ingredientMeta: {
        color: palette.textSecondary,
        fontSize: 13,
        marginTop: 4,
    },
    ingredientConfidence: {
        color: palette.textPrimary,
        fontSize: 13,
        fontWeight: '800',
    },
    swipeAction: {
        alignItems: 'center',
        borderRadius: 22,
        flexDirection: 'row',
        gap: 6,
        justifyContent: 'center',
        marginBottom: 12,
        minWidth: 98,
        paddingHorizontal: 16,
    },
    editAction: {
        backgroundColor: palette.warning,
        marginRight: 10,
    },
    deleteAction: {
        backgroundColor: palette.danger,
        marginLeft: 10,
    },
    swipeActionText: {
        color: palette.background,
        fontSize: 12,
        fontWeight: '900',
    },
    ctaCard: {
        alignItems: 'center',
        backgroundColor: palette.primarySoft,
        borderColor: palette.primaryBorder,
        borderRadius: 22,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 14,
        marginTop: 12,
        padding: 18,
    },
    ctaIcon: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 999,
        height: 46,
        justifyContent: 'center',
        width: 46,
    },
    ctaCopy: {
        flex: 1,
    },
    ctaTitle: {
        color: palette.textPrimary,
        fontSize: 16,
        fontWeight: '900',
    },
    ctaBody: {
        color: palette.textSecondary,
        fontSize: 13,
        marginTop: 4,
    },
});
