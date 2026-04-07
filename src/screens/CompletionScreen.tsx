import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '../navigation/types';
import { recipeRepository } from '../repositories/RecipeRepository';
import { useAppShellStore, useCookingSessionStore } from '../store';
import { palette } from '../theme/colors';

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'Completion'>;

export function CompletionScreen({ navigation, route }: ScreenProps) {
    const { t } = useTranslation();
    const [saved, setSaved] = useState(false);
    const clearLatestAnalysis = useAppShellStore((state) => state.clearLatestAnalysis);
    const reset = useCookingSessionStore((state) => state.reset);
    const contentOpacity = useRef(new Animated.Value(1)).current;
    const contentTranslateY = useRef(new Animated.Value(0)).current;

    const handleSave = async () => {
        await recipeRepository.save(route.params.recipe, route.params.sourceImageUri);
        setSaved(true);
    };

    const closeToRecipes = useCallback(() => {
        reset();
        navigation.reset({
            index: 0,
            routes: [{ name: 'RecipesHub' }],
        });
    }, [navigation, reset]);

    useEffect(() => {
        let active = true;

        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(contentOpacity, {
                    duration: 450,
                    toValue: 0,
                    useNativeDriver: true,
                }),
                Animated.timing(contentTranslateY, {
                    duration: 450,
                    toValue: -18,
                    useNativeDriver: true,
                }),
            ]).start(({ finished }) => {
                if (finished && active) {
                    closeToRecipes();
                }
            });
        }, 3000);

        return () => {
            active = false;
            clearTimeout(timer);
            contentOpacity.stopAnimation();
            contentTranslateY.stopAnimation();
        };
    }, [closeToRecipes, contentOpacity, contentTranslateY]);

    return (
        <LinearGradient colors={[palette.background, palette.backgroundAlt]} style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: contentOpacity,
                            transform: [{ translateY: contentTranslateY }],
                        },
                    ]}
                >
                    <ImageBackground source={route.params.sourceImageUri ? { uri: route.params.sourceImageUri } : undefined} style={styles.hero}>
                        <LinearGradient
                            colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.58)']}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.heroBadge}>
                            <MaterialCommunityIcons color={palette.background} name="check" size={28} />
                        </View>
                    </ImageBackground>

                    <Text style={styles.title}>{t('complete')}</Text>
                    <Text style={styles.subtitle}>{route.params.recipe.title}</Text>

                    <Pressable accessibilityRole="button" onPress={() => void handleSave()} style={styles.primaryButton}>
                        <Text style={styles.primaryButtonText}>
                            {saved ? `${t('saveRecipe')} ✓` : t('saveRecipe')}
                        </Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        onPress={() => navigation.replace('CookingMode', route.params)}
                        style={styles.secondaryButton}
                    >
                        <Text style={styles.secondaryButtonText}>{t('cookAgain')}</Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                            reset();
                            clearLatestAnalysis();
                            navigation.navigate('Camera');
                        }}
                        style={styles.linkButton}
                    >
                        <Text style={styles.linkButtonText}>{t('takeAnotherPhoto')}</Text>
                    </Pressable>
                </Animated.View>
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
    hero: {
        borderRadius: 28,
        height: 240,
        justifyContent: 'center',
        marginBottom: 24,
        overflow: 'hidden',
        width: '100%',
    },
    heroBadge: {
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: palette.primary,
        borderRadius: 999,
        height: 72,
        justifyContent: 'center',
        width: 72,
    },
    title: {
        color: palette.textPrimary,
        fontSize: 32,
        fontWeight: '900',
    },
    subtitle: {
        color: palette.textSecondary,
        fontSize: 16,
        marginBottom: 28,
        marginTop: 8,
        textAlign: 'center',
    },
    primaryButton: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 18,
        paddingHorizontal: 18,
        paddingVertical: 15,
        width: '100%',
    },
    primaryButtonText: {
        color: palette.background,
        fontSize: 15,
        fontWeight: '900',
    },
    secondaryButton: {
        alignItems: 'center',
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 18,
        borderWidth: 1,
        marginTop: 12,
        paddingHorizontal: 18,
        paddingVertical: 15,
        width: '100%',
    },
    secondaryButtonText: {
        color: palette.textPrimary,
        fontSize: 15,
        fontWeight: '800',
    },
    linkButton: {
        marginTop: 22,
    },
    linkButtonText: {
        color: palette.primary,
        fontSize: 14,
        fontWeight: '800',
    },
});
