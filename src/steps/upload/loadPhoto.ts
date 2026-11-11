/** Largest accepted file. */
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
/** Longest side of the decoded photo kept in memory. */
export const MAX_PHOTO_SIDE = 2048;

export type PhotoErrorCode = 'not-image' | 'too-large' | 'decode-failed';

export class PhotoError extends Error {
  readonly code: PhotoErrorCode;
  constructor(code: PhotoErrorCode) {
    super(code);
    this.name = 'PhotoError';
    this.code = code;
  }
}

/** Friendly text for each error, shown inline in the drop zone. */
export const PHOTO_ERROR_MESSAGES: Record<PhotoErrorCode, string> = {
  'not-image': "That file isn't a photo. Try a JPG or PNG.",
  'decode-failed': "We couldn't open that photo. If it came from an iPhone, try exporting it as a JPG first.",
  'too-large': 'That photo is very large. Try one under 25 MB.',
};

/** Scale factor so the longest side is at most `maxSide`; never upscales. */
export function fitScale(width: number, height: number, maxSide = MAX_PHOTO_SIDE): number {
  const longest = Math.max(width, height);
  return longest > maxSide ? maxSide / longest : 1;
}

/**
 * Decode a user-chosen file into upright, downscaled pixels on a white background.
 * Throws PhotoError for anything the UI should explain.
 */
export async function loadPhoto(file: File): Promise<ImageData> {
  // Some browsers report an empty type for HEIC etc.; let those through to the decoder.
  if (file.type && !file.type.startsWith('image/')) throw new PhotoError('not-image');
  if (file.size > MAX_PHOTO_BYTES) throw new PhotoError('too-large');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new PhotoError('decode-failed');
  }

  try {
    const scale = fitScale(bitmap.width, bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new PhotoError('decode-failed');

    // Flatten any transparency onto white.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  } catch (err) {
    if (err instanceof PhotoError) throw err;
    throw new PhotoError('decode-failed');
  } finally {
    bitmap.close();
  }
}
