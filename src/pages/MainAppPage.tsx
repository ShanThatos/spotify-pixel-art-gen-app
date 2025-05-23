// src/pages/MainAppPage.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react'; // Added useCallback
import { getCurrentlyPlayingSong, type CurrentlyPlayingResponse } from '../services/spotifyService';
import { pixelateImage, type PixelShape } from '../utils/pixelate';

interface MainAppPageProps {
  onLogout: () => void;
}

const MainAppPage: React.FC<MainAppPageProps> = ({ onLogout }) => {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlayingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // For refresh indication
  const [error, setError] = useState<string | null>(null);
  const pixelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const INITIAL_BLOCK_SIZE = 15;
  const [blockSize, setBlockSize] = useState<number>(() => {
    const savedBlockSize = localStorage.getItem('pixelBlockSize');
    return savedBlockSize ? Number(savedBlockSize) : INITIAL_BLOCK_SIZE;
  });
  const [showBorders, setShowBorders] = useState<boolean>(() => {
    const savedShowBorders = localStorage.getItem('showBorders');
    return savedShowBorders ? JSON.parse(savedShowBorders) : true;
  });
  const [pixelShape, setPixelShape] = useState<PixelShape>(() => {
    const savedPixelShape = localStorage.getItem('pixelShape');
    return savedPixelShape ? (savedPixelShape as PixelShape) : 'square';
  });
  const [alignPixels, setAlignPixels] = useState<boolean>(() => {
    const savedAlignPixels = localStorage.getItem('alignPixels');
    return savedAlignPixels ? JSON.parse(savedAlignPixels) : true;
  });
  const [areSettingsVisible, setAreSettingsVisible] = useState<boolean>(() => {
    const savedAreSettingsVisible = localStorage.getItem('areSettingsVisible');
    return savedAreSettingsVisible ? JSON.parse(savedAreSettingsVisible) : false;
  });

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('pixelBlockSize', String(blockSize));
  }, [blockSize]);

  useEffect(() => {
    localStorage.setItem('showBorders', JSON.stringify(showBorders));
  }, [showBorders]);

  useEffect(() => {
    localStorage.setItem('pixelShape', pixelShape);
  }, [pixelShape]);

  useEffect(() => {
    localStorage.setItem('alignPixels', JSON.stringify(alignPixels));
  }, [alignPixels]);

  useEffect(() => {
    localStorage.setItem('areSettingsVisible', JSON.stringify(areSettingsVisible));
  }, [areSettingsVisible]);

  // Refactored fetchSong logic
  const fetchCurrentlyPlayingSong = useCallback(async () => {
    setIsRefreshing(true); // Indicate refresh in progress
    setError(null);
    try {
      const songData = await getCurrentlyPlayingSong();
      setCurrentlyPlaying(songData);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
      console.error('Failed to fetch currently playing song:', err);
      setError('Failed to fetch currently playing song.');
    } finally {
      setIsRefreshing(false);
      setIsLoading(false); // Also set isLoading to false after initial load or refresh
    }
  }, []);

  useEffect(() => {
    setIsLoading(true); // Set loading true for initial fetch
    fetchCurrentlyPlayingSong();
  }, [fetchCurrentlyPlayingSong]);

  // useEffect for pixelation
  useEffect(() => {
    if (currentlyPlaying?.item?.album?.images?.[0]?.url && pixelCanvasRef.current) {
      const imageUrl = currentlyPlaying.item.album.images[0].url;
      const displayCanvas = pixelCanvasRef.current;
      
      pixelateImage(imageUrl, blockSize, showBorders, pixelShape, alignPixels)
        .then(pixelatedHighResCanvas => {
          const displayCtx = displayCanvas.getContext('2d');
          if (displayCtx) {
            displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
            // Scale the high-resolution canvas to cover the display canvas while maintaining aspect ratio
            const scale = Math.max(displayCanvas.width / pixelatedHighResCanvas.width, displayCanvas.height / pixelatedHighResCanvas.height); // Use Math.max for cover
            const scaledWidth = pixelatedHighResCanvas.width * scale;
            const scaledHeight = pixelatedHighResCanvas.height * scale;
            const offsetX = (displayCanvas.width - scaledWidth) / 2;
            const offsetY = (displayCanvas.height - scaledHeight) / 2;
            displayCtx.drawImage(pixelatedHighResCanvas, offsetX, offsetY, scaledWidth, scaledHeight);
          }
        })
        .catch(err => {
          console.error('Error during pixelation in component:', err);
          const displayCtx = displayCanvas.getContext('2d');
          if (displayCtx) {
            displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
            displayCtx.font = '12px Arial';
            displayCtx.fillStyle = 'red';
            displayCtx.textAlign = 'center';
            displayCtx.fillText('Could not pixelate image.', displayCanvas.width / 2, displayCanvas.height / 2);
          }
        });
    } else if (pixelCanvasRef.current) {
      const canvas = pixelCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#B3B3B3';
        ctx.textAlign = 'center';
        ctx.fillText('Album art will be pixelated here', canvas.width / 2, canvas.height / 2);
      }
    }
  }, [currentlyPlaying, blockSize, showBorders, pixelShape, alignPixels]);

  const handleLogoutClick = () => {
    onLogout();
  };

  const handleRefreshClick = () => {
    fetchCurrentlyPlayingSong();
  };

  const handleDownloadPixelArt = async () => {
    if (currentlyPlaying?.item?.album?.images?.[0]?.url && pixelCanvasRef.current) {
      const imageUrl = currentlyPlaying.item.album.images[0].url;
      try {
        const highResPixelatedCanvas = await pixelateImage(imageUrl, blockSize, showBorders, pixelShape, alignPixels);
        
        const albumName = currentlyPlaying?.item?.album?.name || 'spotify';
        const artistName = currentlyPlaying?.item?.artists?.[0]?.name || 'artist';
        const safeAlbumName = albumName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeArtistName = artistName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${safeArtistName}_${safeAlbumName}_pixel_art_block${blockSize}.png`;

        // Convert canvas to blob
        const blob = await new Promise<Blob | null>(resolve => highResPixelatedCanvas.toBlob(resolve, 'image/png'));

        if (!blob) {
          throw new Error('Could not convert canvas to Blob.');
        }

        const fileToShare = new File([blob], fileName, { type: 'image/png' });

        // Web Share API check (including device width)
        if (window.innerWidth <= 768 && navigator.share && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
          try {
            await navigator.share({
              files: [fileToShare],
              title: `Pixel Art: ${albumName}`,
              text: `Check out this pixel art I made for ${albumName} by ${artistName}!`,
            });
            console.log('Successfully shared the image.');
          } catch (shareError) {
            console.error('Error sharing:', shareError);
            // Fallback to download if sharing fails (e.g., user cancels)
            // alert('Sharing was cancelled or failed. Downloading the image instead.');
            const dataURL = highResPixelatedCanvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        } else {
          // Fallback to download if Web Share API is not supported, cannot share files, or not on a mobile-sized screen
          console.log('Web Share API not used (not supported, cannot share files, or not on mobile-sized screen), falling back to download.');
          const dataURL = highResPixelatedCanvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = dataURL;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (err) {
        console.error('Error generating or sharing/downloading pixel art:', err);
        alert('Could not generate image for sharing or download. Please try again.');
      }
    }
  };

  // Effect for scroll-up-to-refresh
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let isThrottled = false;

    const handleScroll = () => {
      if (isThrottled) return;

      isThrottled = true;
      setTimeout(() => {
        isThrottled = false;
      }, 500); // Throttle to prevent rapid firing

      const currentScrollY = window.scrollY;
      // Check if at the top and scrolling up
      if (currentScrollY === 0 && lastScrollY === 0 && event && (event as WheelEvent).deltaY < 0) {
        if (!isRefreshing && !isLoading) { // Only refresh if not already doing so
            console.log("Scroll-up refresh triggered");
            fetchCurrentlyPlayingSong();
        }
      }
      lastScrollY = currentScrollY;
    };

    // Using wheel event for deltaY, but also checking scrollY for top position
    window.addEventListener('wheel', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleScroll);
    };
  }, [fetchCurrentlyPlayingSong, isRefreshing, isLoading]); // Add dependencies

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-spotify-black via-spotify-gray-dark to-spotify-gradient-dark-gray text-spotify-text p-4 sm:p-6 md:p-8"> {/* Corrected gradient colors */}
      <div className="w-full max-w-3xl"> {/* Wrapper div for content centering */} 
        <h1 
          className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-center bg-gradient-to-r from-spotify-green to-spotify-green-hover bg-clip-text text-transparent drop-shadow-sm">
          Spotify Pixel Art Generator
        </h1> {/* Adjusted text gradient to be from spotify-green to spotify-green-hover */}
        
        {/* Container for side-by-side layout on medium screens and up */}
        <div className="flex flex-col md:flex-row md:space-x-8 mx-auto"> {/* Removed w-full and max-w-3xl from here, mx-auto for inner centering if needed */}

          {/* Currently Playing Section */}
          <div className="w-full md:w-1/2 p-6 bg-spotify-card rounded-lg shadow-xl mb-6 md:mb-0"> {/* Changed to bg-spotify-card */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-spotify-text">Currently Playing</h2>
              <button
                onClick={handleRefreshClick}
                disabled={isRefreshing || isLoading}
                className="bg-spotify-green hover:bg-spotify-green-hover text-black font-semibold py-1 px-3 rounded-full text-xs transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center cursor-pointer" // Adjusted padding and text size
              >
                {isRefreshing || isLoading ? (
                  <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> {/* Adjusted spinner size and margin */}
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {isRefreshing || isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {/* Initial Loading State (only if no data yet and not already refreshing, and no error) */}
            {isLoading && !isRefreshing && !currentlyPlaying?.item && !error && (
              <p className="text-spotify-text-subdued">Loading song information...</p>
            )}

            {/* Error State */}
            {error && <p className="text-red-400">Error: {error}</p>}

            {/* Song Details (if data exists and no error) */}
            {currentlyPlaying?.item && !error && (
              <div>
                {currentlyPlaying.item.album.images && currentlyPlaying.item.album.images.length > 0 && (
                  <img 
                    src={currentlyPlaying.item.album.images[0].url} 
                    alt={`Album art for ${currentlyPlaying.item.album.name}`} 
                    className="w-full h-auto aspect-square mb-4 rounded shadow object-cover" // Moved image to the top and added mb-4
                  />
                )}
                <p className="text-lg text-spotify-text truncate" title={currentlyPlaying.item.name}><span className="font-semibold">Song:</span> {currentlyPlaying.item.name}</p>
                <p className="text-spotify-text-subdued truncate" title={currentlyPlaying.item.artists.map(artist => artist.name).join(', ')}><span className="font-semibold text-spotify-text">Artist(s):</span> {currentlyPlaying.item.artists.map(artist => artist.name).join(', ')}</p>
                <p className="text-spotify-text-subdued truncate" title={currentlyPlaying.item.album.name}><span className="font-semibold text-spotify-text">Album:</span> {currentlyPlaying.item.album.name}</p>
              </div>
            )}
            
            {/* No Song Playing State (after initial load, if no data and no error) */}
            {!isLoading && !currentlyPlaying?.item && !error && (
              <p className="text-spotify-text-subdued">No song is currently playing, or the Spotify player is inactive. Try refreshing.</p>
            )}
          </div>

          {/* Pixel Art Section */}
          <div className="w-full md:w-1/2 p-6 bg-spotify-card rounded-lg shadow-xl flex flex-col"> {/* Changed to bg-spotify-card */}
            <div className="flex-grow"> {/* Wrapper for content that grows */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-spotify-text">Pixel Art</h2>
                <button
                  onClick={() => setAreSettingsVisible(!areSettingsVisible)}
                  className="text-sm text-spotify-green hover:text-spotify-green-hover font-medium transition-colors duration-150 ease-in-out cursor-pointer hover:underline"
                >
                  {areSettingsVisible ? 'Hide Settings' : 'Show Settings'}
                </button>
              </div>
              
              <div 
                className={`transition-all duration-500 ease-in-out overflow-hidden ${areSettingsVisible ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="mb-4 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* Added mt-2 for spacing when visible */}
                  <div>
                    <label htmlFor="blockSizeSlider" className="block text-sm font-medium text-spotify-text-subdued mb-1">
                      Pixel Size: {blockSize}px
                    </label>
                    <input 
                      type="range" 
                      id="blockSizeSlider" 
                      min="5" 
                      max="50" 
                      step="1" 
                      value={blockSize} 
                      onChange={(e) => setBlockSize(Number(e.target.value))} 
                      className="w-full h-2 bg-spotify-light-gray rounded-lg appearance-none cursor-pointer accent-spotify-green"
                    />
                  </div>

                  <div>
                    <label htmlFor="pixelShapeSelect" className="block text-sm font-medium text-spotify-text-subdued mb-1">
                      Pixel Shape
                    </label>
                    <select
                      id="pixelShapeSelect"
                      value={pixelShape}
                      onChange={(e) => setPixelShape(e.target.value as PixelShape)}
                      className="w-full p-2 bg-spotify-light-gray border border-spotify-light-gray text-spotify-text rounded-md focus:ring-spotify-green focus:border-spotify-green text-sm cursor-pointer custom-select-arrow"
                    >
                      <option value="square">Square</option>
                      <option value="circle">Circle</option>
                    </select>
                  </div>
                  
                  <div className="sm:col-span-2 flex items-center">
                    <input
                      type="checkbox"
                      id="showBordersToggle"
                      checked={showBorders}
                      onChange={(e) => setShowBorders(e.target.checked)}
                      className="h-4 w-4 text-spotify-green bg-spotify-light-gray border-spotify-light-gray rounded focus:ring-spotify-green accent-spotify-green cursor-pointer"
                    />
                    <label htmlFor="showBordersToggle" className="ml-2 text-sm font-medium text-spotify-text-subdued select-none cursor-pointer">
                      Defined Pixels (Show Borders)
                    </label>
                  </div>

                  <div className="sm:col-span-2 flex items-center">
                    <input
                      type="checkbox"
                      id="alignPixelsToggle"
                      checked={alignPixels}
                      onChange={(e) => setAlignPixels(e.target.checked)}
                      className="h-4 w-4 text-spotify-green bg-spotify-light-gray border-spotify-light-gray rounded focus:ring-spotify-green accent-spotify-green cursor-pointer"
                    />
                    <label htmlFor="alignPixelsToggle" className="ml-2 text-sm font-medium text-spotify-text-subdued select-none cursor-pointer">
                      Align Pixels
                    </label>
                  </div>
                </div> {/* Closing tag for the settings grid div */}
              </div> {/* Add closing tag for the animated settings container div */}

              <canvas
                id="pixelArtCanvas" 
                ref={pixelCanvasRef}
                width="300" // Keep fixed, pixelateImage handles scaling to this
                height="300" // Keep fixed, pixelateImage handles scaling to this
                className="border border-spotify-light-gray mx-auto block bg-spotify-light-gray w-full aspect-square object-contain" /* Removed max-w-xs */
                title="Pixel art will appear here"
              ></canvas>
            </div> {/* Closing flex-grow wrapper */}

            {/* Download button moved below the canvas and outside the flex-grow wrapper */}
            {currentlyPlaying?.item?.album?.images?.[0]?.url && (
              <button
                onClick={handleDownloadPixelArt}
                className="mt-4 w-full bg-spotify-green hover:bg-spotify-green-hover text-black font-semibold py-2 px-4 rounded-full text-sm transition duration-150 ease-in-out flex items-center justify-center cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Pixel Art
              </button>
            )}
          </div>
        </div>
        <button
          onClick={handleLogoutClick}
          className="w-full max-w-md md:max-w-xs border border-spotify-text-subdued hover:border-spotify-text text-spotify-text-subdued hover:text-spotify-text font-medium py-2 px-4 rounded mt-8 mb-4 mx-auto block cursor-pointer transition-colors duration-150 ease-in-out" // Added mx-auto and block, adjusted mt
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default MainAppPage;
