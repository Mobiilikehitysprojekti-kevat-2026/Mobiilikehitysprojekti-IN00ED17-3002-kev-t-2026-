import {
  CameraView,
  type CameraMountError,
  type CameraCapturedPicture,
  type CameraType,
  type FlashMode,
} from 'expo-camera';
import { useCameraPermissions } from 'expo-camera';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { CapturedImage } from '../types/image';
import { AppError } from '../utils/errors';

function toCapturedImage(picture: CameraCapturedPicture): CapturedImage {
  return {
    height: picture.height,
    sizeKB: 0,
    uri: picture.uri,
    width: picture.width,
  };
}

export function useCamera() {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isAvailable, setIsAvailable] = useState(Platform.OS !== 'web');
  const [mountErrorMessage, setMountErrorMessage] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setIsAvailable(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const available = await CameraView.isAvailableAsync();
        if (!cancelled) {
          setIsAvailable(available);
        }
      } catch {
        if (!cancelled) {
          setIsAvailable(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasPermission = permission?.granted ?? false;

  const permissionState = useMemo(
    () => ({
      canAskAgain: permission?.canAskAgain ?? true,
      hasPermission,
      isAvailable,
      mountErrorMessage,
    }),
    [hasPermission, isAvailable, mountErrorMessage, permission?.canAskAgain],
  );

  const captureImage = async (): Promise<CapturedImage> => {
    if (!cameraRef.current) {
      throw new AppError('Camera is not ready yet.', 'CAMERA_NOT_READY');
    }

    const picture = await cameraRef.current.takePictureAsync({
      exif: false,
      quality: 0.8,
      shutterSound: false,
      skipProcessing: false,
    });

    return toCapturedImage(picture);
  };

  return {
    cameraRef,
    captureImage,
    facing,
    flash,
    flipCamera: () => setFacing((current) => (current === 'back' ? 'front' : 'back')),
    handleMountError: (event: CameraMountError) => {
      setIsAvailable(false);
      setMountErrorMessage(event.message);
    },
    permission: permissionState,
    requestPermission,
    setFlash: () => setFlash((current) => (current === 'off' ? 'on' : 'off')),
    torchEnabled: flash === 'on',
  };
}