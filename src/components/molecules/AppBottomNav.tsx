import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { palette } from '../../theme/colors';

type TabKey = 'scan' | 'recipes' | 'pantry';

interface AppBottomNavProps {
    activeTab: TabKey;
    onPantry: () => void;
    onRecipes: () => void;
    onScan: () => void;
}

function TabItem({
    active,
    iconName,
    label,
    onPress,
}: {
    active: boolean;
    iconName: ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
    onPress: () => void;
}) {
    const scale = useRef(new Animated.Value(active ? 1 : 0.94)).current;
    const opacity = useRef(new Animated.Value(active ? 1 : 0.78)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                damping: 16,
                mass: 0.8,
                stiffness: 180,
                toValue: active ? 1 : 0.94,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                duration: 180,
                toValue: active ? 1 : 0.78,
                useNativeDriver: true,
            }),
        ]).start();
    }, [active, opacity, scale]);

    return (
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
            <Pressable
                accessibilityRole="button"
                onPress={onPress}
                style={[styles.sideTab, active && styles.sideTabActive]}
            >
                <MaterialCommunityIcons
                    color={active ? palette.primary : palette.textSecondary}
                    name={iconName}
                    size={24}
                />
                <Text style={[styles.sideTabLabel, active && styles.sideTabLabelActive]}>{label}</Text>
            </Pressable>
        </Animated.View>
    );
}

export function AppBottomNav({
    activeTab,
    onPantry,
    onRecipes,
    onScan,
}: AppBottomNavProps) {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const scanScale = useRef(new Animated.Value(activeTab === 'scan' ? 1 : 0.94)).current;

    useEffect(() => {
        Animated.spring(scanScale, {
            damping: 16,
            mass: 0.8,
            stiffness: 180,
            toValue: activeTab === 'scan' ? 1 : 0.94,
            useNativeDriver: true,
        }).start();
    }, [activeTab, scanScale]);

    return (
        <View
            style={[
                styles.container,
                {
                    paddingBottom: Math.max(insets.bottom, 16),
                },
            ]}
        >
            <TabItem
                active={activeTab === 'recipes'}
                iconName="silverware-fork-knife"
                label={t('recipes')}
                onPress={onRecipes}
            />

            <Animated.View style={[styles.scanWrap, { transform: [{ scale: scanScale }] }]}>
                <Pressable
                    accessibilityRole="button"
                    onPress={onScan}
                    style={[styles.scanButton, activeTab === 'scan' && styles.scanButtonActive]}
                >
                    <MaterialCommunityIcons color={palette.background} name="camera-outline" size={32} />
                </Pressable>
                <Text style={[styles.sideTabLabel, styles.scanLabel, activeTab === 'scan' && styles.sideTabLabelActive]}>
                    {t('scan')}
                </Text>
            </Animated.View>

            <TabItem
                active={activeTab === 'pantry'}
                iconName="fridge-outline"
                label={t('pantry')}
                onPress={onPantry}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        backgroundColor: 'rgba(7, 26, 8, 0.96)',
        borderTopColor: palette.outlineStrong,
        borderTopWidth: 1,
        bottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        left: 0,
        minHeight: 98,
        paddingHorizontal: 14,
        paddingTop: 10,
        position: 'absolute',
        right: 0,
    },
    sideTab: {
        alignItems: 'center',
        alignSelf: 'flex-end',
        borderRadius: 18,
        flex: 1,
        gap: 6,
        justifyContent: 'flex-end',
        minWidth: 82,
        paddingBottom: 10,
        paddingTop: 8,
    },
    sideTabActive: {
        backgroundColor: 'rgba(105, 227, 16, 0.08)',
    },
    sideTabLabel: {
        color: palette.textSecondary,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    sideTabLabelActive: {
        color: palette.primary,
    },
    scanWrap: {
        alignItems: 'center',
        flex: 1,
        gap: 6,
        justifyContent: 'flex-start',
    },
    scanButton: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderColor: palette.primaryBorder,
        borderRadius: 999,
        borderWidth: 4,
        height: 72,
        justifyContent: 'center',
        marginTop: -18,
        width: 72,
    },
    scanButtonActive: {
        shadowColor: palette.primary,
        shadowOpacity: 0.24,
        shadowRadius: 14,
        shadowOffset: {
            height: 6,
            width: 0,
        },
    },
    scanLabel: {
        color: palette.textPrimary,
        paddingBottom: 4,
    },
});
