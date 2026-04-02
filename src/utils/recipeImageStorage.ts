import { Directory, File, Paths } from 'expo-file-system';

const RECIPE_IMAGE_DIRECTORY = new Directory(Paths.document, 'recipe-images');

function buildFileExtension(uri: string) {
  const matchedExtension = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)?.[1]?.toLowerCase();
  return matchedExtension ? `.${matchedExtension}` : '.jpg';
}

export async function persistRecipeImageUri(imageUri?: string): Promise<string | undefined> {
  if (!imageUri || /^https?:\/\//i.test(imageUri) || !imageUri.startsWith('file://')) {
    return imageUri;
  }

  try {
    if (!RECIPE_IMAGE_DIRECTORY.exists) {
      RECIPE_IMAGE_DIRECTORY.create({
        idempotent: true,
        intermediates: true,
      });
    }

    const sourceFile = new File(imageUri);
    if (!sourceFile.exists) {
      return imageUri;
    }

    const targetFile = new File(
      RECIPE_IMAGE_DIRECTORY,
      `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${buildFileExtension(imageUri)}`,
    );

    sourceFile.copy(targetFile);
    return targetFile.uri;
  } catch {
    return imageUri;
  }
}