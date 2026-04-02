import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
    ImageBackground,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppBottomNav } from '../components/molecules/AppBottomNav';
import type { RootStackParamList } from '../navigation/types';
import { recipeRepository } from '../repositories/RecipeRepository';
import { palette } from '../theme/colors';
import type { RecipeDTO, SavedRecipeRecord } from '../types/api';

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'MealSuggestions'>;

function recipeCardSubtitle(recipe: RecipeDTO) {
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

function RecipeCard({
    imageUri,
    onPress,
    onToggleSave,
    recipe,
    saved,
    tag,
    viewRecipeLabel,
}: {
    imageUri?: string;
    onPress: () => void;
    onToggleSave: () => void;
    recipe: RecipeDTO;
    saved: boolean;
    tag: string;
    viewRecipeLabel: string;
}) {
    return (
        <View style={styles.card}>
            <Pressable accessibilityRole="button" onPress={onPress}>
                <ImageBackground source={imageUri ? { uri: imageUri } : undefined} style={styles.cardHero}>
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.72)']}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.cardTopRow}>
                        <View style={styles.matchBadge}>
                            <Text style={styles.matchBadgeText}>{tag}</Text>
                        </View>
                        <SaveBadge onPress={onToggleSave} saved={saved} />
                    </View>
                    <Text style={styles.cardHeroMeta}>{recipeCardSubtitle(recipe)}</Text>
                </ImageBackground>
            </Pressable>

            <View style={styles.cardBody}>
                <Pressable accessibilityRole="button" onPress={onPress}>
                    <Text style={styles.cardTitle}>{recipe.title}</Text>
                    <Text style={styles.cardDescription}>
                        {recipe.ingredients.slice(0, 3).map((ingredient) => ingredient.name).join(', ')}
                    </Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={onPress} style={styles.cardButton}>
                    <Text style={styles.cardButtonText}>{viewRecipeLabel}</Text>
                </Pressable>
            </View>
        </View>
    );
}

export function MealSuggestionsScreen({ navigation, route }: ScreenProps) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [savedRecords, setSavedRecords] = useState<SavedRecipeRecord[]>([]);
    const currentRecipe = route.params.analysis.suggestedRecipe;

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            const records = await recipeRepository.findAllRecords();
            if (!cancelled) {
                setSavedRecords(records);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [currentRecipe.id]);

    const handleToggleSave = async (recipe: RecipeDTO) => {
        const isSaved = savedRecords.some((record) => record.recipe.id === recipe.id);

        if (isSaved) {
            await recipeRepository.delete(recipe.id);
        } else {
            await recipeRepository.save(recipe, route.params.sourceImageUri);
        }

        const records = await recipeRepository.findAllRecords();
        setSavedRecords(records);
    };

    const isSavedRecipe = (recipeId: string) =>
        savedRecords.some((record) => record.recipe.id === recipeId);

    return (
        <LinearGradient colors={[palette.background, '#081408']} style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingBottom: 110 + insets.bottom,
                        },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerTitle}>{t('personalizedSuggestions')}</Text>
                            <Text style={styles.headerSubtitle}>
                                {t('pantryItemsShapingResult', {
                                    count: route.params.selectedIngredients.length,
                                })}
                            </Text>
                        </View>
                        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()}>
                            <MaterialCommunityIcons color={palette.textPrimary} name="close" size={28} />
                        </Pressable>
                    </View>

                    <Text style={styles.sectionLabel}>{t('currentRecipe')}</Text>
                    <RecipeCard
                        imageUri={route.params.sourceImageUri}
                        onPress={() =>
                            navigation.navigate('Recipe', {
                                availableIngredients: route.params.selectedIngredients,
                                recipe: currentRecipe,
                                sourceImageUri: route.params.sourceImageUri,
                            })
                        }
                        onToggleSave={() => void handleToggleSave(currentRecipe)}
                        recipe={currentRecipe}
                        saved={isSavedRecipe(currentRecipe.id)}
                        tag={t('aiPick')}
                        viewRecipeLabel={t('viewRecipe')}
                    />

                    <Text style={[styles.sectionLabel, styles.savedSection]}>{t('savedRecipes')}</Text>
                    {savedRecords.filter((record) => record.recipe.id !== currentRecipe.id).length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>{t('noSavedRecipes')}</Text>
                        </View>
                    ) : (
                        savedRecords
                            .filter((record) => record.recipe.id !== currentRecipe.id)
                            .map((record) => (
                                <RecipeCard
                                    key={record.recipe.id}
                                    imageUri={record.imageUri}
                                    onPress={() =>
                                        navigation.navigate('Recipe', {
                                            availableIngredients: route.params.selectedIngredients,
                                            recipe: record.recipe,
                                            sourceImageUri: record.imageUri,
                                        })
                                    }
                                    onToggleSave={() => void handleToggleSave(record.recipe)}
                                    recipe={record.recipe}
                                    saved={isSavedRecipe(record.recipe.id)}
                                    tag={t('savedRecipes')}
                                    viewRecipeLabel={t('viewRecipe')}
                                />
                            ))
                    )}
                </ScrollView>
            </SafeAreaView>

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
    headerSubtitle: {
        color: palette.textSecondary,
        fontSize: 14,
        marginTop: 6,
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
    savedSection: {
        marginTop: 28,
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
    matchBadge: {
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: palette.primary,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    matchBadgeText: {
        color: palette.background,
        fontSize: 11,
        fontWeight: '900',
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
    cardHeroMeta: {
        color: palette.textPrimary,
        fontSize: 12,
        fontWeight: '700',
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
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    cardButtonText: {
        color: palette.background,
        fontSize: 14,
        fontWeight: '900',
    },
    emptyState: {
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 22,
        borderWidth: 1,
        padding: 18,
    },
    emptyStateText: {
        color: palette.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
});
