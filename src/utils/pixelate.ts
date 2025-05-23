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

/**
 * Pixelates an image and draws it onto a given canvas.
 * @param imageUrl The URL of the image to pixelate.
 * @param outputCanvas The HTMLCanvasElement to draw the pixelated image onto.
 * @param blockSize The size of the pixel blocks (e.g., 10 for 10x10 blocks).
 */
export async function pixelateImage(
  imageUrl: string,
  outputCanvas: HTMLCanvasElement,
  blockSize: number
): Promise<void> {
  if (!outputCanvas) {
    console.error('Output canvas not provided for pixelation.');
    return;
  }
  if (blockSize <= 0) {
    console.error('Block size must be greater than 0.');
    return;
  }

  try {
    const image = await loadImage(imageUrl);
    const inputCanvas = document.createElement('canvas');
    // Add willReadFrequently attribute here
    const inputCtx = inputCanvas.getContext('2d', { willReadFrequently: true });
    const outputCtx = outputCanvas.getContext('2d');

    if (!inputCtx || !outputCtx) {
      console.error('Failed to get canvas context.');
      return;
    }

    // Resize input canvas to image dimensions
    inputCanvas.width = image.width;
    inputCanvas.height = image.height;
    inputCtx.drawImage(image, 0, 0);

    // Clear output canvas (optional, good practice)
    outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    
    // Ensure output canvas has dimensions (can be same as image or scaled)
    // For simplicity, let's make output canvas same as image size for now.
    // The canvas element in MainAppPage is 300x300, so this might need adjustment
    // or the image might be scaled before pixelation / output canvas scaled.
    // Let's assume outputCanvas is already sized appropriately by the caller.
    // We will draw the pixelated version matching the original image's aspect ratio
    // scaled to fit the outputCanvas.

    const scaleX = outputCanvas.width / image.width;
    const scaleY = outputCanvas.height / image.height;
    // Use the smaller scale to maintain aspect ratio and fit within canvas
    const scale = Math.min(scaleX, scaleY); 

    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;

    // Center the image on the output canvas
    const offsetX = (outputCanvas.width - scaledWidth) / 2;
    const offsetY = (outputCanvas.height - scaledHeight) / 2;


    for (let y = 0; y < image.height; y += blockSize) {
      for (let x = 0; x < image.width; x += blockSize) {
        const imageData = inputCtx.getImageData(x, y, blockSize, blockSize);
        const data = imageData.data;
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          // Only count fully opaque pixels or handle transparency as needed
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
          const avgA = Math.round(a / count); // Or use a fixed alpha like 255

          outputCtx.fillStyle = `rgba(${avgR}, ${avgG}, ${avgB}, ${avgA / 255})`;
          
          // Draw on the output canvas, scaled and offset
          outputCtx.fillRect(
            offsetX + (x * scale), 
            offsetY + (y * scale), 
            blockSize * scale, 
            blockSize * scale
          );
        }
      }
    }
  } catch (error) {
    console.error('Error pixelating image:', error);
    // Optionally, draw an error message on the canvas
    if (outputCanvas) {
        const ctx = outputCanvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
            ctx.font = '16px Arial';
            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            ctx.fillText('Error loading image.', outputCanvas.width / 2, outputCanvas.height / 2);
        }
    }
  }
}
