// src/pages/MainAppPage.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react'; // Added useCallback
import { getCurrentlyPlayingSong, type CurrentlyPlayingResponse } from '../services/spotifyService';
import { pixelateImage } from '../utils/pixelate';

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
  // Initialize blockSize from localStorage or use INITIAL_BLOCK_SIZE
  const [blockSize, setBlockSize] = useState<number>(() => {
    const savedBlockSize = localStorage.getItem('pixelBlockSize');
    return savedBlockSize ? Number(savedBlockSize) : INITIAL_BLOCK_SIZE;
  });

  // Effect to save blockSize to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pixelBlockSize', String(blockSize));
  }, [blockSize]);

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
      
      pixelateImage(imageUrl, blockSize)
        .then(pixelatedHighResCanvas => {
          const displayCtx = displayCanvas.getContext('2d');
          if (displayCtx) {
            displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
            // Scale the high-resolution canvas to fit the display canvas while maintaining aspect ratio
            const scale = Math.min(displayCanvas.width / pixelatedHighResCanvas.width, displayCanvas.height / pixelatedHighResCanvas.height);
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
  }, [currentlyPlaying, blockSize]);

  const handleLogoutClick = () => {
    onLogout();
  };

  const handleRefreshClick = () => {
    fetchCurrentlyPlayingSong();
  };

  const handleDownloadPixelArt = async () => { // Make async
    if (currentlyPlaying?.item?.album?.images?.[0]?.url && pixelCanvasRef.current) {
      const imageUrl = currentlyPlaying.item.album.images[0].url;
      try {
        const highResPixelatedCanvas = await pixelateImage(imageUrl, blockSize);
        const dataURL = highResPixelatedCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        const albumName = currentlyPlaying?.item?.album?.name || 'spotify';
        const artistName = currentlyPlaying?.item?.artists?.[0]?.name || 'artist';
        const safeAlbumName = albumName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeArtistName = artistName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `${safeArtistName}_${safeAlbumName}_pixel_art_block${blockSize}.png`;
        document.body.appendChild(link); 
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Error generating high-res pixel art for download:', err);
        // Optionally, show an error to the user
        alert('Could not generate image for download. Please try again.');
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
          <div className="w-full md:w-1/2 p-6 bg-spotify-gray rounded-lg shadow-xl mb-6 md:mb-0">
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

            {/* Refreshing State */}
            {isRefreshing && (
              <p className="text-spotify-text-subdued">Refreshing song information...</p>
            )}

            {/* Error State */}
            {error && <p className="text-red-400">Error: {error}</p>}

            {/* Song Details (if data exists and no error) */}
            {currentlyPlaying?.item && !error && (
              <div>
                <p className="text-lg text-spotify-text truncate" title={currentlyPlaying.item.name}><span className="font-semibold">Song:</span> {currentlyPlaying.item.name}</p>
                <p className="text-spotify-text-subdued truncate" title={currentlyPlaying.item.artists.map(artist => artist.name).join(', ')}><span className="font-semibold text-spotify-text">Artist(s):</span> {currentlyPlaying.item.artists.map(artist => artist.name).join(', ')}</p>
                <p className="text-spotify-text-subdued truncate" title={currentlyPlaying.item.album.name}><span className="font-semibold text-spotify-text">Album:</span> {currentlyPlaying.item.album.name}</p>
                {currentlyPlaying.item.album.images && currentlyPlaying.item.album.images.length > 0 && (
                  <img 
                    src={currentlyPlaying.item.album.images[0].url} 
                    alt={`Album art for ${currentlyPlaying.item.album.name}`} 
                    className="w-full h-auto aspect-square mt-4 rounded shadow object-cover" /* Removed max-w-xs and mx-auto */
                  />
                )}
              </div>
            )}
            
            {/* No Song Playing State (after initial load, if no data and no error) */}
            {!isLoading && !currentlyPlaying?.item && !error && (
              <p className="text-spotify-text-subdued">No song is currently playing, or the Spotify player is inactive. Try refreshing.</p>
            )}
          </div>

          {/* Pixel Art Section */}
          <div className="w-full md:w-1/2 p-6 bg-spotify-gray rounded-lg shadow-xl">
            <h2 className="text-xl font-semibold mb-2 text-spotify-text">Pixel Art</h2>
            
            <div className="mb-4">
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

            <canvas 
              id="pixelArtCanvas" 
              ref={pixelCanvasRef}
              width="300" // Keep fixed, pixelateImage handles scaling to this
              height="300" // Keep fixed, pixelateImage handles scaling to this
              className="border border-spotify-light-gray mx-auto block bg-spotify-light-gray w-full aspect-square object-contain" /* Removed max-w-xs */
              title="Pixel art will appear here"
            ></canvas>

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
