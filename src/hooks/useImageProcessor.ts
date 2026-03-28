import { Image } from 'react-native';

import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { CapturedImage, ProcessedImage } from '../types/image';
import { AppError } from '../utils/errors';

const MAX_WIDTH = 1024;
const MAX_UPLOAD_SIZE_KB = 2048;

async function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ height, width }), reject);
  });
}

export function useImageProcessor() {
  const processForUpload = async (image: CapturedImage): Promise<ProcessedImage> => {
    const originalSize =
      image.width > 0 && image.height > 0
        ? { height: image.height, width: image.width }
        : await getImageSize(image.uri);

    const shouldResize = originalSize.width > MAX_WIDTH;
    const targetWidth = shouldResize ? MAX_WIDTH : originalSize.width;
    const targetHeight = shouldResize
      ? Math.round((originalSize.height / originalSize.width) * MAX_WIDTH)
      : originalSize.height;

    const context = ImageManipulator.manipulate(image.uri);
    context.resize({
      height: targetHeight,
      width: targetWidth,
    });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({
      compress: 0.8,
      format: SaveFormat.JPEG,
    });

    const sizeBytes = new File(result.uri).size;
    const sizeKB = Math.ceil(sizeBytes / 1024);
    if (sizeKB > MAX_UPLOAD_SIZE_KB) {
      throw new AppError(
        'The image is too large after compression. Please try a closer photo.',
        'IMAGE_TOO_LARGE',
        { sizeKB },
      );
    }

    return {
      height: result.height,
      mimeType: 'image/jpeg',
      sizeKB,
      uri: result.uri,
      width: result.width,
    };
  };

  return {
    processForUpload,
  };
}