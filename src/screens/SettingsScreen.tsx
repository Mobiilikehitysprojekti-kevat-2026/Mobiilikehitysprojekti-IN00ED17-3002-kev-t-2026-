import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '../navigation/types';
import { usePreferencesStore } from '../store/preferencesStore';
import { palette } from '../theme/colors';
import type { Locale } from '../types/api';

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const localeOptions: Array<{ id: Locale; labelKey: 'languageEnglish' | 'languageFinnish' }> = [
    { id: 'en', labelKey: 'languageEnglish' },
    { id: 'fi', labelKey: 'languageFinnish' },
];

export function SettingsScreen({ navigation }: ScreenProps) {
    const { t, i18n } = useTranslation();
    const selectedLocale = usePreferencesStore((state) => state.locale);
    const setLocale = usePreferencesStore((state) => state.setLocale);

    const handleLocaleSelect = (locale: Locale) => {
        setLocale(locale);
        void i18n.changeLanguage(locale);
    };

    return (
        <LinearGradient colors={[palette.background, palette.backgroundAlt]} style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
                            <MaterialCommunityIcons color={palette.textPrimary} name="arrow-left" size={24} />
                        </Pressable>
                        <View style={styles.headerCopy}>
                            <Text style={styles.headerTitle}>{t('settings')}</Text>
                            <Text style={styles.headerSubtitle}>{t('settingsSubtitle')}</Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>{t('appLanguage')}</Text>
                        <Text style={styles.cardBody}>{t('appLanguageDescription')}</Text>

                        <View style={styles.optionList}>
                            {localeOptions.map((option) => {
                                const active = option.id === selectedLocale;
                                return (
                                    <Pressable
                                        key={option.id}
                                        accessibilityRole="button"
                                        onPress={() => handleLocaleSelect(option.id)}
                                        style={[styles.optionButton, active && styles.optionButtonActive]}
                                    >
                                        <View>
                                            <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                                                {t(option.labelKey)}
                                            </Text>
                                            <Text style={[styles.optionMeta, active && styles.optionMetaActive]}>
                                                {option.id.toUpperCase()}
                                            </Text>
                                        </View>
                                        <MaterialCommunityIcons
                                            color={active ? palette.background : palette.textSecondary}
                                            name={active ? 'check-circle' : 'circle-outline'}
                                            size={22}
                                        />
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>{t('dataInsights')}</Text>
                        <Text style={styles.cardBody}>{t('dataInsightsDesc')}</Text>

                        <View style={styles.optionList}>
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => navigation.navigate('AnalysisStatistics')}
                                style={styles.optionButton}
                            >
                                <View>
                                    <Text style={styles.optionTitle}>{t('dataInsights')}</Text>
                                </View>
                                <MaterialCommunityIcons
                                    color={palette.textSecondary}
                                    name="chevron-right"
                                    size={24}
                                />
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>{t('voiceGuidance')}</Text>
                        <Text style={styles.cardBody}>{t('voiceGuidanceDescription')}</Text>
                    </View>
                </ScrollView>
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
    scrollContent: {
        paddingHorizontal: 18,
        paddingTop: 12,
    },
    header: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 16,
        marginBottom: 22,
    },
    backButton: {
        alignItems: 'center',
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 999,
        borderWidth: 1,
        height: 46,
        justifyContent: 'center',
        width: 46,
    },
    headerCopy: {
        flex: 1,
    },
    headerTitle: {
        color: palette.textPrimary,
        fontSize: 28,
        fontWeight: '900',
    },
    headerSubtitle: {
        color: palette.textSecondary,
        fontSize: 14,
        marginTop: 6,
    },
    card: {
        backgroundColor: palette.surface,
        borderColor: palette.outlineStrong,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 18,
        padding: 18,
    },
    cardLabel: {
        color: palette.primary,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    cardBody: {
        color: palette.textSecondary,
        fontSize: 15,
        lineHeight: 22,
        marginTop: 8,
    },
    optionList: {
        gap: 12,
        marginTop: 18,
    },
    optionButton: {
        alignItems: 'center',
        backgroundColor: palette.backgroundSoft,
        borderColor: palette.outlineStrong,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 15,
    },
    optionButtonActive: {
        backgroundColor: palette.primary,
        borderColor: palette.primary,
    },
    optionTitle: {
        color: palette.textPrimary,
        fontSize: 16,
        fontWeight: '800',
    },
    optionTitleActive: {
        color: palette.background,
    },
    optionMeta: {
        color: palette.textMuted,
        fontSize: 12,
        fontWeight: '700',
        marginTop: 4,
    },
    optionMetaActive: {
        color: 'rgba(7, 26, 8, 0.72)',
    },
});
