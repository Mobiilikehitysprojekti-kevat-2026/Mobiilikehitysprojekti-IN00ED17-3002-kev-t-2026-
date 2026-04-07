import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '../navigation/types';
import { palette } from '../theme/colors';

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'Recipe'>;

export function RecipeScreen({ navigation, route }: ScreenProps) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { recipe, availableIngredients, sourceImageUri } = route.params;

    return (
        <LinearGradient colors={[palette.background, palette.backgroundAlt]} style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingBottom: 120 + insets.bottom,
                        },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.contentWrap}>
                        <View style={styles.topBar}>
                            <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
                                <MaterialCommunityIcons color={palette.textPrimary} name="arrow-left" size={24} />
                            </Pressable>

                            <View style={styles.heroMetaRow}>
                                <View style={styles.metaPill}>
                                    <Text style={styles.metaPillText}>{recipe.totalTimeMinutes} min</Text>
                                </View>
                                <View style={styles.metaPill}>
                                    <Text style={styles.metaPillText}>{recipe.difficulty}</Text>
                                </View>
                            </View>
                        </View>

                        <ImageBackground
                            imageStyle={styles.heroImage}
                            resizeMode="cover"
                            source={sourceImageUri ? { uri: sourceImageUri } : undefined}
                            style={styles.hero}
                        >
                            <LinearGradient
                                colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.62)']}
                                style={StyleSheet.absoluteFill}
                            />
                        </ImageBackground>

                        <Text style={styles.title}>{recipe.title}</Text>
                        <Text style={styles.subtitle}>
                            {t('recipeDetailsSummary', {
                                cuisine: recipe.cuisine,
                                servings: recipe.servings,
                            })}
                        </Text>

                        <Text style={styles.sectionLabel}>{t('detectedIngredients')}</Text>
                        <View style={styles.sectionCard}>
                            {recipe.ingredients.map((ingredient, index) => {
                                const available = availableIngredients.some(
                                    (item) => item.name.toLowerCase() === ingredient.name.toLowerCase(),
                                );

                                return (
                                    <View key={`${ingredient.name}-${index}`} style={styles.listRow}>
                                        <MaterialCommunityIcons
                                            color={available ? palette.primary : palette.textSecondary}
                                            name={available ? 'check-circle' : 'circle-outline'}
                                            size={18}
                                        />
                                        <Text style={styles.listText}>
                                            {ingredient.name}
                                            {ingredient.quantity ? ` • ${ingredient.quantity}` : ''}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>

                        <Text style={styles.sectionLabel}>{t('recipeOverview')}</Text>
                        <View style={styles.sectionCard}>
                            {recipe.steps.map((step) => (
                                <View key={step.stepNumber} style={styles.stepPreviewRow}>
                                    <View style={styles.stepBadge}>
                                        <Text style={styles.stepBadgeText}>{step.stepNumber}</Text>
                                    </View>
                                    <View style={styles.stepPreviewCopy}>
                                        <Text style={styles.stepInstruction}>{step.instruction}</Text>
                                        {step.tip ? <Text style={styles.stepTip}>{step.tip}</Text> : null}
                                    </View>
                                </View>
                            ))}
                        </View>
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
                    onPress={() =>
                        navigation.navigate('CookingMode', {
                            recipe,
                            sourceImageUri,
                        })
                    }
                    style={styles.startButton}
                >
                    <Text style={styles.startButtonText}>{t('startCooking')}</Text>
                    <MaterialCommunityIcons color={palette.background} name="arrow-right" size={22} />
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
        paddingTop: 12,
    },
    backButton: {
        alignItems: 'center',
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 999,
        borderWidth: 1,
        height: 42,
        justifyContent: 'center',
        width: 42,
    },
    topBar: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    hero: {
        borderRadius: 30,
        height: 278,
        marginBottom: 20,
        overflow: 'hidden',
    },
    heroImage: {
        borderRadius: 30,
    },
    heroMetaRow: {
        flexDirection: 'row',
        gap: 10,
    },
    metaPill: {
        backgroundColor: 'rgba(7, 26, 8, 0.72)',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    metaPillText: {
        color: palette.textPrimary,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'capitalize',
    },
    contentWrap: {
        paddingHorizontal: 18,
        paddingTop: 6,
    },
    title: {
        color: palette.textPrimary,
        fontSize: 34,
        fontWeight: '900',
        lineHeight: 40,
    },
    subtitle: {
        color: palette.textSecondary,
        fontSize: 15,
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
    sectionCard: {
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 22,
        borderWidth: 1,
        padding: 16,
    },
    listRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    listText: {
        color: palette.textPrimary,
        flex: 1,
        fontSize: 15,
        lineHeight: 22,
    },
    stepPreviewRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    stepBadge: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 999,
        height: 28,
        justifyContent: 'center',
        width: 28,
    },
    stepBadgeText: {
        color: palette.background,
        fontSize: 12,
        fontWeight: '900',
    },
    stepPreviewCopy: {
        flex: 1,
    },
    stepInstruction: {
        color: palette.textPrimary,
        fontSize: 15,
        lineHeight: 22,
    },
    stepTip: {
        color: palette.textSecondary,
        fontSize: 13,
        lineHeight: 18,
        marginTop: 6,
    },
    bottomBar: {
        alignItems: 'center',
        backgroundColor: 'rgba(7, 26, 8, 0.96)',
        borderTopColor: palette.outlineStrong,
        borderTopWidth: 1,
        bottom: 0,
        gap: 10,
        left: 0,
        paddingHorizontal: 18,
        paddingTop: 14,
        position: 'absolute',
        right: 0,
    },
    startButton: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 18,
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'center',
        paddingHorizontal: 18,
        paddingVertical: 15,
        width: '100%',
    },
    startButtonText: {
        color: palette.background,
        fontSize: 16,
        fontWeight: '900',
    },
});
