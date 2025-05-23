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

export type PixelShape = 'square' | 'circle';

/**
 * Pixelates an image and returns a new canvas with the pixelated result.
 * @param imageUrl The URL of the image to pixelate.
 * @param blockSize The size of the pixel blocks (e.g., 10 for 10x10 blocks).
 * @param drawBorders Whether to draw borders around pixels. Defaults to false.
 * @param pixelShape The shape of the pixels. Defaults to 'square'.
 * @param alignPixels Whether to align pixels to the block size. Defaults to false.
 * @returns A Promise that resolves with an HTMLCanvasElement containing the pixelated image.
 */
export async function pixelateImage(
  imageUrl: string,
  blockSize: number,
  drawBorders: boolean = false,
  pixelShape: PixelShape = 'square',
  alignPixels: boolean = false
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

    // Adjust internalWidth and internalHeight for aligned pixels
    let adjustedWidth = processingCanvas.width;
    let adjustedHeight = processingCanvas.height;
    let adjustedBlockSize = blockSize;

    if (alignPixels) {
      // Calculate the number of full blocks that can fit
      const numBlocksX = Math.floor(processingCanvas.width / blockSize);
      const numBlocksY = Math.floor(processingCanvas.height / blockSize);

      if (numBlocksX > 0 && numBlocksY > 0) {
        // Adjust the canvas size to fit these blocks perfectly
        adjustedWidth = numBlocksX * blockSize;
        adjustedHeight = numBlocksY * blockSize;
      } else {
        // If the image is smaller than one block, don't align, or use original size
        // This case might need specific handling depending on desired behavior
        // For now, we'll proceed with original dimensions if alignment isn't feasible
      }
      // No change to adjustedBlockSize needed here as we are fitting the canvas to the blocks
    } else {
      // If not aligning, the adjustedBlockSize is just the original blockSize
      // and dimensions remain as calculated for processingCanvas
    }

    // Draw the source image onto the processingCanvas, scaling it up if necessary
    // If aligning, we might be drawing to a slightly smaller (cropped) effective area
    // but the source image is still drawn to the full processingCanvas dimensions first.
    // The looping logic below will then only process the adjustedWidth/Height.
    processingCtx.drawImage(image, 0, 0, processingCanvas.width, processingCanvas.height);

    // Create the result canvas
    const resultCanvas = document.createElement('canvas');
    // The result canvas should use the adjusted dimensions if alignPixels is true
    resultCanvas.width = alignPixels ? adjustedWidth : processingCanvas.width;
    resultCanvas.height = alignPixels ? adjustedHeight : processingCanvas.height;
    const resultCtx = resultCanvas.getContext('2d');

    if (!resultCtx) {
        throw new Error('Failed to get result canvas context.');
    }
    
    resultCtx.imageSmoothingEnabled = false;

    // Use adjustedWidth and adjustedHeight for looping if alignPixels is true
    const loopWidth = alignPixels ? adjustedWidth : processingCanvas.width;
    const loopHeight = alignPixels ? adjustedHeight : processingCanvas.height;

    for (let y = 0; y < loopHeight; y += adjustedBlockSize) {
      for (let x = 0; x < loopWidth; x += adjustedBlockSize) {
        // When aligning, sampleWidth/Height will always be adjustedBlockSize
        // because the loopWidth/Height is a multiple of adjustedBlockSize.
        const sampleWidth = Math.min(adjustedBlockSize, loopWidth - x);
        const sampleHeight = Math.min(adjustedBlockSize, loopHeight - y);

        if (sampleWidth <= 0 || sampleHeight <= 0) continue;

        // Get image data from the original processingCanvas, at the current x, y
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

          if (pixelShape === 'circle') {
            resultCtx.beginPath();
            resultCtx.arc(
              x + adjustedBlockSize / 2, // Corrected X center for consistent positioning
              y + adjustedBlockSize / 2, // Corrected Y center for consistent positioning
              adjustedBlockSize / 2, 
              0,
              2 * Math.PI
            );
            resultCtx.fill();
          } else { // Default to square
            resultCtx.fillRect(
              x, 
              y, 
              sampleWidth, 
              sampleHeight 
            );
          }

          if (drawBorders && blockSize > 2) { // Only draw borders if blockSize is large enough to see them
            resultCtx.strokeStyle = 'rgba(0,0,0,0.2)'; // Subtle black border
            resultCtx.lineWidth = Math.max(1, blockSize * 0.05); // Border width relative to block size, min 1px
            if (pixelShape === 'circle') {
              resultCtx.stroke(); // Stroke the existing circular path
            } else {
              resultCtx.strokeRect(
                x + resultCtx.lineWidth / 2, 
                y + resultCtx.lineWidth / 2, 
                sampleWidth - resultCtx.lineWidth, 
                sampleHeight - resultCtx.lineWidth
              );
            }
          }
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
