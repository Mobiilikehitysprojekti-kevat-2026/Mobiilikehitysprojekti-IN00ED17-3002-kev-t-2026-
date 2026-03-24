import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
    ActivityIndicator,
    ImageBackground,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconCircleButton } from '../components/atoms/IconCircleButton';
import { useCamera } from '../hooks/useCamera';
import type { RootStackParamList } from '../navigation/types';
import { palette } from '../theme/colors';
import type { CapturedImage } from '../types/image';

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'Camera'>;

export function CameraScreen({ navigation }: ScreenProps) {
    const { t } = useTranslation();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const [previewImage, setPreviewImage] = useState<CapturedImage | null>(null);
    const [libraryBusy, setLibraryBusy] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const {
        cameraRef,
        captureImage,
        facing,
        flash,
        flipCamera,
        handleMountError,
        permission,
        requestPermission,
        setFlash,
        torchEnabled,
    } = useCamera();

    const handleCapture = async () => {
        try {
            setErrorMessage(null);
            const image = await captureImage();
            setPreviewImage(image);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : t('scanError'));
        }
    };

    const handleOpenLibrary = async () => {
        setLibraryBusy(true);
        setErrorMessage(null);

        try {
            const permissionResponse = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResponse.granted) {
                setErrorMessage(t('cameraPermissionBody'));
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                allowsEditing: false,
                mediaTypes: ['images'],
                quality: 1,
                selectionLimit: 1,
            });

            if (result.canceled || !result.assets[0]) {
                return;
            }

            const asset = result.assets[0];
            setPreviewImage({
                height: asset.height,
                sizeKB: Math.ceil((asset.fileSize ?? 0) / 1024),
                uri: asset.uri,
                width: asset.width,
            });
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : t('scanError'));
        } finally {
            setLibraryBusy(false);
        }
    };

    const renderCameraBody = () => {
        if (previewImage) {
            return (
                <ImageBackground source={{ uri: previewImage.uri }} style={styles.camera}>
                    <LinearGradient
                        colors={['rgba(0,0,0,0.24)', 'transparent', 'rgba(0,0,0,0.62)']}
                        style={StyleSheet.absoluteFill}
                    />
                </ImageBackground>
            );
        }

        if (!permission.hasPermission) {
            return (
                <View style={styles.placeholderCard}>
                    <MaterialCommunityIcons color={palette.primary} name="camera-off" size={48} />
                    <Text style={styles.placeholderTitle}>{t('cameraPermissionTitle')}</Text>
                    <Text style={styles.placeholderBody}>{t('cameraPermissionBody')}</Text>
                    <Pressable accessibilityRole="button" onPress={() => void requestPermission()} style={styles.primaryButton}>
                        <Text style={styles.primaryButtonText}>{t('grantPermission')}</Text>
                    </Pressable>
                </View>
            );
        }

        if (!permission.isAvailable) {
            return (
                <View style={styles.placeholderCard}>
                    <MaterialCommunityIcons color={palette.primary} name="cellphone-off" size={48} />
                    <Text style={styles.placeholderTitle}>{t('noCameraTitle')}</Text>
                    <Text style={styles.placeholderBody}>
                        {permission.mountErrorMessage ?? t('noCameraBody')}
                    </Text>
                </View>
            );
        }

        return (
            <CameraView
                active={isFocused && !previewImage}
                enableTorch={torchEnabled}
                facing={facing}
                flash={flash}
                mode="picture"
                onMountError={handleMountError}
                ref={cameraRef}
                style={styles.camera}
            />
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView
                edges={['top', 'left', 'right']}
                style={styles.safeArea}
            >
                <View style={styles.header}>
                    <IconCircleButton
                        iconName="close"
                        onPress={() =>
                            navigation.canGoBack() ? navigation.goBack() : navigation.navigate('RecipesHub')
                        }
                    />

                    <View style={styles.headerCenter}>
                        <Text style={styles.title}>{t('appName')}</Text>
                        <View style={styles.liveRow}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveLabel}>{t('liveVision')}</Text>
                        </View>
                    </View>

                    <IconCircleButton iconName="camera-flip-outline" onPress={flipCamera} />
                </View>

                <View style={styles.cameraWrap}>{renderCameraBody()}</View>

                {errorMessage ? (
                    <View style={styles.errorBanner}>
                        <MaterialCommunityIcons color={palette.warning} name="alert-circle-outline" size={18} />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : null}

                <View
                    style={[
                        styles.bottomPanel,
                        {
                            paddingBottom: Math.max(insets.bottom, 16),
                        },
                    ]}
                >
                    {previewImage ? (
                        <View style={styles.previewActions}>
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => setPreviewImage(null)}
                                style={[styles.secondaryButton, styles.secondaryButtonWide]}
                            >
                                <Text style={styles.secondaryButtonText}>{t('retake')}</Text>
                            </Pressable>

                            <Pressable
                                accessibilityRole="button"
                                onPress={() => navigation.navigate('AnalysisLoading', { image: previewImage })}
                                style={[styles.primaryButton, styles.primaryButtonWide]}
                            >
                                <Text style={styles.primaryButtonText}>{t('confirm')}</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.panelTitle}>{t('takePhoto')}</Text>
                            <Text style={styles.panelBody}>{t('analyzeHint')}</Text>

                            <View style={styles.controlRow}>
                                <IconCircleButton
                                    backgroundColor={palette.surfaceElevated}
                                    borderColor={palette.outlineStrong}
                                    iconName="flash"
                                    iconColor={flash === 'off' ? palette.textSecondary : palette.primary}
                                    onPress={setFlash}
                                    size={56}
                                    style={styles.sideActionButton}
                                />

                                <Pressable accessibilityRole="button" onPress={handleCapture} style={styles.captureButton}>
                                    <MaterialCommunityIcons color={palette.background} name="camera-outline" size={38} />
                                </Pressable>

                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => void handleOpenLibrary()}
                                    style={[styles.libraryButton, styles.sideActionButton]}
                                >
                                    {libraryBusy ? (
                                        <ActivityIndicator color={palette.primary} />
                                    ) : (
                                        <MaterialCommunityIcons color={palette.textPrimary} name="image-outline" size={24} />
                                    )}
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: palette.background,
        flex: 1,
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: 18,
    },
    header: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 16,
        paddingTop: 8,
    },
    headerCenter: {
        alignItems: 'center',
    },
    title: {
        color: palette.textPrimary,
        fontSize: 24,
        fontWeight: '900',
    },
    liveRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
        marginTop: 4,
    },
    liveDot: {
        backgroundColor: palette.primary,
        borderRadius: 999,
        height: 8,
        width: 8,
    },
    liveLabel: {
        color: palette.textSecondary,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    cameraWrap: {
        borderColor: palette.outlineStrong,
        borderRadius: 34,
        borderWidth: 1,
        flex: 1,
        overflow: 'hidden',
    },
    camera: {
        flex: 1,
    },
    placeholderCard: {
        alignItems: 'center',
        backgroundColor: palette.surface,
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    placeholderTitle: {
        color: palette.textPrimary,
        fontSize: 24,
        fontWeight: '900',
        marginTop: 18,
        textAlign: 'center',
    },
    placeholderBody: {
        color: palette.textSecondary,
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 18,
        marginTop: 10,
        textAlign: 'center',
    },
    primaryButton: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 18,
        justifyContent: 'center',
        paddingHorizontal: 18,
        paddingVertical: 14,
    },
    primaryButtonWide: {
        flex: 1,
    },
    primaryButtonText: {
        color: palette.background,
        fontSize: 15,
        fontWeight: '900',
    },
    secondaryButton: {
        alignItems: 'center',
        backgroundColor: palette.surfaceElevated,
        borderColor: palette.outlineStrong,
        borderRadius: 18,
        borderWidth: 1,
        justifyContent: 'center',
        paddingHorizontal: 18,
        paddingVertical: 14,
    },
    secondaryButtonWide: {
        flex: 1,
    },
    secondaryButtonText: {
        color: palette.textPrimary,
        fontSize: 15,
        fontWeight: '800',
    },
    errorBanner: {
        alignItems: 'center',
        backgroundColor: palette.warningSoft,
        borderColor: palette.warningBorder,
        borderRadius: 18,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 8,
        marginTop: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    errorText: {
        color: palette.warning,
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
    },
    bottomPanel: {
        paddingBottom: 8,
        paddingTop: 20,
    },
    panelTitle: {
        color: palette.textPrimary,
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
    },
    panelBody: {
        color: palette.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 6,
        textAlign: 'center',
    },
    controlRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 18,
    },
    sideActionButton: {
        marginBottom: 10,
    },
    captureButton: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderColor: 'rgba(105, 227, 16, 0.28)',
        borderRadius: 999,
        borderWidth: 6,
        height: 88,
        justifyContent: 'center',
        marginHorizontal: 24,
        width: 88,
    },
    libraryButton: {
        alignItems: 'center',
        backgroundColor: palette.surfaceElevated,
        borderColor: palette.outlineStrong,
        borderRadius: 999,
        borderWidth: 1,
        height: 56,
        justifyContent: 'center',
        width: 56,
    },
    previewActions: {
        flexDirection: 'row',
        gap: 12,
    },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 18,
    },
    navItem: {
        color: palette.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    navItemActive: {
        color: palette.primary,
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
});
