/**
 * Cloudinary unsigned upload utility.
 *
 * Reads VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET from
 * the environment. Both are set via Replit Secrets.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

/** Maximum allowed file size (5 MB). */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

export interface UploadResult {
  /** Public Cloudinary URL for viewing. */
  fileUrl: string;
  /** URL with fl_attachment for forced download. */
  downloadUrl: string;
  /** Cloudinary public_id — kept for future management. */
  publicId: string;
}

/**
 * Upload a file to Cloudinary via unsigned upload.
 *
 * @param file           The file to upload.
 * @param onProgress     Optional callback receiving 0–100 progress value.
 */
export function uploadToCloudinary(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return Promise.reject(
      new Error(
        'Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.',
      ),
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(
      new Error(
        `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 5 MB.`,
      ),
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const fileUrl: string = data.secure_url;
          // fl_attachment forces download instead of inline display
          const downloadUrl = fileUrl.replace('/upload/', '/upload/fl_attachment/');
          resolve({ fileUrl, downloadUrl, publicId: data.public_id });
        } catch {
          reject(new Error('Failed to parse Cloudinary response.'));
        }
      } else {
        let msg = `Upload failed (HTTP ${xhr.status})`;
        try {
          const err = JSON.parse(xhr.responseText);
          if (err?.error?.message) msg = err.error.message;
        } catch {/* ignore */}
        reject(new Error(msg));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload.')));
    xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled.')));

    xhr.send(formData);
  });
}
