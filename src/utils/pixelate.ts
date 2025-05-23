// src/utils/pixelate.ts

/**
 * Loads an image from a URL.
 * @param imageUrl The URL of the image to load.
 * @returns A Promise that resolves with the HTMLImageElement.
 */
function loadImage(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Handle CORS if the image is from a different origin
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
}

const MIN_INTERNAL_RESOLUTION = 600; // Define the minimum resolution for processing

/**
 * Pixelates an image and returns a new canvas with the pixelated result.
 * @param imageUrl The URL of the image to pixelate.
 * @param blockSize The size of the pixel blocks (e.g., 10 for 10x10 blocks).
 * @returns A Promise that resolves with an HTMLCanvasElement containing the pixelated image.
 */
export async function pixelateImage(
  imageUrl: string,
  blockSize: number
): Promise<HTMLCanvasElement> {
  if (blockSize <= 0) {
    // console.error('Block size must be greater than 0.'); // Error will be caught by caller
    throw new Error('Block size must be greater than 0.');
  }

  // try { // Not needed, async function errors will reject the promise
    const image = await loadImage(imageUrl);
    const processingCanvas = document.createElement('canvas'); // Was inputCanvas
    const processingCtx = processingCanvas.getContext('2d', { willReadFrequently: true });

    if (!processingCtx) {
      throw new Error('Failed to get processing canvas context.');
    }

    // Determine dimensions for the internal processing canvas (processingCanvas)
    let internalWidth = image.width;
    let internalHeight = image.height;
    const aspectRatio = image.width / image.height;

    if (image.width < MIN_INTERNAL_RESOLUTION || image.height < MIN_INTERNAL_RESOLUTION) {
      if (aspectRatio >= 1) { // Wider or square image
        internalWidth = MIN_INTERNAL_RESOLUTION;
        internalHeight = MIN_INTERNAL_RESOLUTION / aspectRatio;
      } else { // Taller image
        internalHeight = MIN_INTERNAL_RESOLUTION;
        internalWidth = MIN_INTERNAL_RESOLUTION * aspectRatio;
      }
    }

    processingCanvas.width = Math.round(internalWidth);
    processingCanvas.height = Math.round(internalHeight);

    // Draw the source image onto the processingCanvas, scaling it up if necessary
    processingCtx.drawImage(image, 0, 0, processingCanvas.width, processingCanvas.height);

    // Create the result canvas with the same dimensions as the processing canvas
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = processingCanvas.width;
    resultCanvas.height = processingCanvas.height;
    const resultCtx = resultCanvas.getContext('2d');

    if (!resultCtx) {
        throw new Error('Failed to get result canvas context.');
    }
    
    // No outputCtx.clearRect needed as resultCanvas is new and outputCanvas param is removed
    // No finalScale, finalOffsetX, finalOffsetY needed here as we draw directly to resultCanvas matching processingCanvas size

    for (let y = 0; y < processingCanvas.height; y += blockSize) {
      for (let x = 0; x < processingCanvas.width; x += blockSize) {
        const sampleWidth = Math.min(blockSize, processingCanvas.width - x);
        const sampleHeight = Math.min(blockSize, processingCanvas.height - y);

        if (sampleWidth <= 0 || sampleHeight <= 0) continue;

        const imageData = processingCtx.getImageData(x, y, sampleWidth, sampleHeight);
        const data = imageData.data;
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) { // Check alpha channel
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            a += data[i + 3];
            count++;
          }
        }

        if (count > 0) {
          const avgR = Math.round(r / count);
          const avgG = Math.round(g / count);
          const avgB = Math.round(b / count);
          const avgA = Math.round(a / count); 
          
          resultCtx.fillStyle = `rgba(${avgR}, ${avgG}, ${avgB}, ${avgA / 255})`;

          // Draw the averaged block directly onto the resultCanvas
          resultCtx.fillRect(
            x, // Draw at the block's original x position
            y, // Draw at the block's original y position
            sampleWidth, // Use the actual sampleWidth for the block
            sampleHeight // Use the actual sampleHeight for the block
          );
        }
      }
    }
    return resultCanvas; // Return the high-resolution pixelated canvas
  // } catch (error) { // Errors will propagate and reject the promise
  //   console.error('Error pixelating image:', error);
  //   // Remove drawing to outputCanvas as it's no longer a parameter
  //   throw error; // Re-throw
  // }
}
