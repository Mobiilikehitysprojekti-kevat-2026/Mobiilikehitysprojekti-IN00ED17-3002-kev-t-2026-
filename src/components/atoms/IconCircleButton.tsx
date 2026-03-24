import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';

import { palette } from '../../theme/colors';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface IconCircleButtonProps {
    iconName: IconName;
    onPress?: () => void;
    size?: number;
    iconSize?: number;
    backgroundColor?: string;
    iconColor?: string;
    borderColor?: string;
    style?: ViewStyle;
}

export function IconCircleButton({
    iconName,
    onPress,
    size = 44,
    iconSize = 22,
    backgroundColor = 'rgba(255, 255, 255, 0.14)',
    iconColor = palette.white,
    borderColor = 'transparent',
    style,
}: IconCircleButtonProps) {
    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                {
                    width: size,
                    height: size,
                    backgroundColor,
                    borderColor,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                },
                style,
            ]}
        >
            <MaterialCommunityIcons color={iconColor} name={iconName} size={iconSize} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        alignItems: 'center',
        borderRadius: 999,
        borderWidth: 1,
        justifyContent: 'center',
    },
});
