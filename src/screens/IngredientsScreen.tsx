import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '../navigation/types';
import { useAppShellStore } from '../store';
import { palette } from '../theme/colors';
import type { IngredientCategory, IngredientDTO } from '../types/api';

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'Ingredients'>;

function normalizeIngredient(ingredient: IngredientDTO, index: number): IngredientDTO {
    return {
        ...ingredient,
        id: ingredient.id ?? `${ingredient.name}-${index}`,
    };
}

export function IngredientsScreen({ navigation, route }: ScreenProps) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const setPantryIngredients = useAppShellStore((state) => state.setPantryIngredients);
    const setSelectedIngredients = useAppShellStore((state) => state.setSelectedIngredients);
    const [activeCategory, setActiveCategory] = useState<'all' | IngredientCategory>('all');
    const [manualIngredient, setManualIngredient] = useState('');
    const [ingredients, setIngredients] = useState(
        route.params.analysis.detectedIngredients.map(normalizeIngredient),
    );
    const [selectedIds, setSelectedIds] = useState<string[]>(
        route.params.analysis.detectedIngredients.map((ingredient, index) =>
            normalizeIngredient(ingredient, index).id ?? `${ingredient.name}-${index}`,
        ),
    );
    const categories: Array<{ id: 'all' | IngredientCategory; icon: string; label: string }> = [
        { id: 'all', icon: 'view-grid-outline', label: t('categoryAll') },
        { id: 'vegetable', icon: 'leaf', label: t('categoryVegetables') },
        { id: 'dairy', icon: 'cup-water', label: t('categoryDairy') },
        { id: 'protein', icon: 'food-steak', label: t('categoryProteins') },
        { id: 'fruit', icon: 'fruit-cherries', label: t('categoryFruits') },
    ];

    const visibleIngredients = useMemo(
        () =>
            ingredients.filter((ingredient) =>
                activeCategory === 'all' ? true : ingredient.category === activeCategory,
            ),
        [activeCategory, ingredients],
    );

    const selectedIngredients = ingredients.filter((ingredient) =>
        selectedIds.includes(ingredient.id ?? ingredient.name),
    );

    const toggleIngredient = (ingredientId: string) => {
        setSelectedIds((current) =>
            current.includes(ingredientId)
                ? current.filter((item) => item !== ingredientId)
                : [...current, ingredientId],
        );
    };

    const addManualIngredient = () => {
        const trimmed = manualIngredient.trim();
        if (!trimmed) {
            return;
        }

        const nextIngredient: IngredientDTO = {
            category: 'other',
            confidence: 1,
            id: `${trimmed}-${Date.now()}`,
            name: trimmed,
            quantity: '',
        };

        setIngredients((current) => [nextIngredient, ...current]);
        setSelectedIds((current) => [nextIngredient.id ?? trimmed, ...current]);
        setManualIngredient('');
    };

    return (
        <LinearGradient colors={[palette.background, palette.backgroundAlt]} style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingBottom: 126 + insets.bottom,
                        },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerRow}>
                        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()}>
                            <MaterialCommunityIcons color={palette.textPrimary} name="arrow-left" size={28} />
                        </Pressable>
                        <Text style={styles.headerTitle}>{t('detectedIngredients')}</Text>
                        <View style={styles.countPill}>
                            <Text style={styles.countPillText}>{selectedIngredients.length}</Text>
                        </View>
                    </View>

                    <Text style={styles.subtleLabel}>
                        {t('ingredientsFound', { count: route.params.analysis.detectedIngredients.length })}
                    </Text>

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
                                    <MaterialCommunityIcons
                                        color={active ? palette.background : palette.primary}
                                        name={category.icon as never}
                                        size={18}
                                    />
                                    <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                                        {category.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.manualAddRow}>
                        <TextInput
                            onChangeText={setManualIngredient}
                            placeholder={t('manualIngredientPlaceholder')}
                            placeholderTextColor={palette.textMuted}
                            style={styles.input}
                            value={manualIngredient}
                        />
                        <Pressable accessibilityRole="button" onPress={addManualIngredient} style={styles.addButton}>
                            <MaterialCommunityIcons color={palette.background} name="plus" size={22} />
                        </Pressable>
                    </View>

                    {visibleIngredients.map((ingredient) => {
                        const ingredientId = ingredient.id ?? ingredient.name;
                        const selected = selectedIds.includes(ingredientId);
                        const lowConfidence = ingredient.confidence < 0.5;

                        return (
                            <Pressable
                                key={ingredientId}
                                accessibilityRole="button"
                                onPress={() => toggleIngredient(ingredientId)}
                                style={[
                                    styles.ingredientCard,
                                    !selected && styles.ingredientCardMuted,
                                    lowConfidence && styles.ingredientCardWarning,
                                ]}
                            >
                                <View style={styles.ingredientIcon}>
                                    <MaterialCommunityIcons
                                        color={selected ? palette.primary : palette.textSecondary}
                                        name={selected ? 'check-circle' : 'circle-outline'}
                                        size={24}
                                    />
                                </View>

                                <View style={styles.ingredientContent}>
                                    <Text style={styles.ingredientTitle}>{ingredient.name}</Text>
                                    <Text style={styles.ingredientMeta}>
                                        {t(
                                            `category${ingredient.category.charAt(0).toUpperCase()}${ingredient.category.slice(1)}`,
                                        )}
                                        {ingredient.quantity ? ` • ${ingredient.quantity}` : ''}
                                    </Text>
                                    <View style={styles.confidenceRow}>
                                        <View style={styles.confidenceTrack}>
                                            <View
                                                style={[
                                                    styles.confidenceFill,
                                                    {
                                                        width: `${Math.max(6, ingredient.confidence * 100)}%`,
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.confidenceText}>
                                            {Math.round(ingredient.confidence * 100)}%
                                        </Text>
                                    </View>
                                    {lowConfidence ? (
                                        <Text style={styles.lowConfidenceText}>{t('lowConfidence')}</Text>
                                    ) : null}
                                </View>
                            </Pressable>
                        );
                    })}
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
                <View>
                    <Text style={styles.bottomBarLabel}>
                        {t('selectedItems', { count: selectedIngredients.length })}
                    </Text>
                </View>
                <Pressable
                    accessibilityRole="button"
                    disabled={selectedIngredients.length === 0}
                    onPress={() => {
                        setPantryIngredients(ingredients);
                        setSelectedIngredients(selectedIngredients);
                        navigation.navigate('MealSuggestions', {
                            analysis: route.params.analysis,
                            selectedIngredients,
                            sourceImageUri: route.params.sourceImageUri,
                        });
                    }}
                    style={[
                        styles.bottomBarButton,
                        selectedIngredients.length === 0 && styles.bottomBarButtonDisabled,
                    ]}
                >
                    <Text style={styles.bottomBarButtonText}>{t('continueToRecipes')}</Text>
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
        paddingTop: 8,
    },
    headerRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    headerTitle: {
        color: palette.textPrimary,
        fontSize: 22,
        fontWeight: '900',
    },
    countPill: {
        alignItems: 'center',
        backgroundColor: palette.primarySoft,
        borderRadius: 999,
        height: 34,
        justifyContent: 'center',
        minWidth: 34,
        paddingHorizontal: 10,
    },
    countPillText: {
        color: palette.primary,
        fontSize: 12,
        fontWeight: '900',
    },
    subtleLabel: {
        color: palette.textSecondary,
        fontSize: 14,
        marginTop: 12,
    },
    categoryRow: {
        gap: 10,
        paddingVertical: 18,
    },
    categoryChip: {
        alignItems: 'center',
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    categoryChipActive: {
        backgroundColor: palette.primary,
    },
    categoryChipText: {
        color: palette.textPrimary,
        fontSize: 14,
        fontWeight: '800',
    },
    categoryChipTextActive: {
        color: palette.background,
    },
    manualAddRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
        marginBottom: 18,
    },
    input: {
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 18,
        borderWidth: 1,
        color: palette.textPrimary,
        flex: 1,
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    addButton: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 16,
        height: 50,
        justifyContent: 'center',
        width: 50,
    },
    ingredientCard: {
        alignItems: 'center',
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 22,
        borderWidth: 1,
        flexDirection: 'row',
        marginBottom: 14,
        padding: 16,
    },
    ingredientCardMuted: {
        opacity: 0.5,
    },
    ingredientCardWarning: {
        borderColor: palette.warningBorder,
    },
    ingredientIcon: {
        marginRight: 14,
    },
    ingredientContent: {
        flex: 1,
    },
    ingredientTitle: {
        color: palette.textPrimary,
        fontSize: 18,
        fontWeight: '900',
    },
    ingredientMeta: {
        color: palette.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    confidenceRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },
    confidenceTrack: {
        backgroundColor: palette.backgroundSoft,
        borderRadius: 999,
        flex: 1,
        height: 8,
        overflow: 'hidden',
    },
    confidenceFill: {
        backgroundColor: palette.primary,
        borderRadius: 999,
        height: '100%',
    },
    confidenceText: {
        color: palette.textSecondary,
        fontSize: 12,
        fontWeight: '800',
        width: 42,
    },
    lowConfidenceText: {
        color: palette.warning,
        fontSize: 12,
        fontWeight: '700',
        marginTop: 8,
    },
    bottomBar: {
        alignItems: 'center',
        backgroundColor: 'rgba(7, 26, 8, 0.96)',
        borderTopColor: palette.outlineStrong,
        borderTopWidth: 1,
        bottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        left: 0,
        paddingHorizontal: 18,
        paddingTop: 14,
        position: 'absolute',
        right: 0,
    },
    bottomBarLabel: {
        color: palette.textSecondary,
        fontSize: 13,
        fontWeight: '700',
    },
    bottomBarButton: {
        backgroundColor: palette.primary,
        borderRadius: 18,
        paddingHorizontal: 18,
        paddingVertical: 14,
    },
    bottomBarButtonDisabled: {
        opacity: 0.4,
    },
    bottomBarButtonText: {
        color: palette.background,
        fontSize: 14,
        fontWeight: '900',
    },
});
