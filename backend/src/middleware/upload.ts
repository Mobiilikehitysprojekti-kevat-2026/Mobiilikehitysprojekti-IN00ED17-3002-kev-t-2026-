import multer from 'multer';

const maxImageSizeMb = Number.parseInt(process.env.MAX_IMAGE_SIZE_MB ?? '5', 10);

export const upload = multer({
  fileFilter: (_request, file, callback) => {
    if (file.mimetype.startsWith('image/')) {
      callback(null, true);
      return;
    }

    callback(new Error('Only image uploads are supported.'));
  },
  limits: {
    fileSize: maxImageSizeMb * 1024 * 1024,
  },
  storage: multer.memoryStorage(),
});
