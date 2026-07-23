/**
 * Converts any image (File or Blob) to WebP format, resizes it to max 800px (width/height), and applies compression.
 * @param imageBlob The original image Blob or File
 * @param quality The quality of the WebP image (between 0.0 and 1.0)
 * @returns A Promise resolving to the compressed WebP File
 */
export async function compressAndConvertToWebP(imageBlob: Blob | File, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        // Limit the dimensions to max 800px on either side to maintain high quality but small file size (below 200KB)
        const maxDimension = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Clear canvas for transparent alpha channel support
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to generate WebP Blob from Canvas'));
              return;
            }
            const timestamp = Date.now();
            const filename = `produto-${timestamp}.webp`;
            const file = new File([blob], filename, { type: 'image/webp' });
            resolve(file);
          },
          'image/webp',
          quality
        );
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(imageBlob);
  });
}
