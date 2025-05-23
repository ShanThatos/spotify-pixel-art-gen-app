<!-- filepath: c:\\Users\\shanthkoka\\Documents\\Projects\\spotify-art-gen-frontend\\plan.md -->
# Project Plan: Spotify Pixel Art Generator

**Objective:** Develop a Single Page Application (SPA) that allows users to authenticate with Spotify, fetch their currently playing song, and generate pixel art from the song's album cover. The application will be built using Vite, React, and TypeScript, employing the Spotify API Authorization Code with PKCE Flow.

## Project Phases

---

## Phase 1: Project Setup & Authentication (Est. 2-3 days)

### Task 1.1: Initialize Project
- [x] Set up a new Vite project with React and TypeScript.
  - [x] Run `npm create vite@latest spotify-art-gen-frontend -- --template react-ts` (or `yarn create vite spotify-art-gen-frontend --template react-ts`).
  - [x] Install necessary base dependencies.
  - [x] Establish basic project structure (e.g., `src/components`, `src/services`, `src/hooks`, `src/pages`, `src/styles`, `src/utils`).

### Task 1.2: Spotify Developer App Setup
- [x] Create an application on the Spotify Developer Dashboard.
  - [x] Register the app and obtain `Client ID`.
  - [x] Configure `Redirect URIs` (e.g., `http://localhost:5173/` for dev, production URL later, ensuring it's the root).

### Task 1.3: Implement Spotify Authentication (PKCE Flow)
- [x] Implement the Authorization Code with PKCE flow.

#### 1.3.1: PKCE Code Generation
  - [x] Create utility functions (in `src/utils/auth.ts`) for `code_verifier` (random string) and `code_challenge` (SHA256 hash of verifier, base64url encoded).

#### 1.3.2: Authorization Request
  - [x] Construct authorization URL for `https://accounts.spotify.com/authorize` in `LoginPage.tsx`.
  - [x] Parameters: `client_id`, `response_type=code`, `redirect_uri` (root URI), `scope` (e.g., `user-read-currently-playing`), `code_challenge`, `code_challenge_method=S256`, `state`.
  - [x] Redirect user to this URL from `LoginPage.tsx`.

#### 1.3.3: Handle Redirect & Token Exchange (in `App.tsx`)
  - [x] On application load, `App.tsx` checks URL for `code` and `state` parameters.
  - [x] Parse `authorization_code` and `state` from URL query parameters in `App.tsx`.
  - [x] Validate `state` against stored value.
  - [x] POST to `https://accounts.spotify.com/api/token` from `App.tsx` to exchange `authorization_code` for `access_token`.
  - [x] Parameters: `grant_type=authorization_code`, `code`, `redirect_uri` (root URI), `client_id`, `code_verifier`.
  - [x] Clean `code` and `state` from URL after processing.

#### 1.3.4: Token Management
  - [x] Securely store the `access_token` in `localStorage`.
  - [x] Clear token from `localStorage` on logout.

### Task 1.4: Basic UI Layout & View Management
- [x] Create placeholder components and manage views.
  - [x] Manage page views (`LoginPage` or `MainAppPage`) in `App.tsx` based on authentication status (presence of `access_token`).
  - [x] Create page components: `LoginPage.tsx`, `MainAppPage.tsx`. (`CallbackPage.tsx` removed).
  - [x] Implement "Login with Spotify" button on `LoginPage.tsx`.
  - [x] `MainAppPage.tsx` view is shown only if authenticated, managed by `App.tsx`.

---

## Phase 2: Spotify API Integration - Currently Playing Song (Est. 1-2 days)

### Task 2.1: Spotify API Service Module
- [x] Create a TypeScript module/service for Spotify API calls (e.g., `src/services/spotifyService.ts`).
  - [x] Use `fetch` API or `axios`.
  - [x] Auto-include `Authorization: Bearer <access_token>` header.
  - [x] Implement error handling and response parsing.

### Task 2.2: Fetch Currently Playing Song
- [x] Implement logic to fetch the user's currently playing song.
  - [x] Call `https://api.spotify.com/v1/me/player/currently-playing` endpoint.
  - [x] Handle responses (song playing, no song, 204 No Content).
  - [x] Extract song name, artist(s), album name, album image URL (e.g., 300x300 or 640x640).

### Task 2.3: Display Song Information
- [x] Create React components to display song details on `MainAppPage.tsx`.
  - [x] Component for song title, artist(s), album.
  - [x] Display album cover image (`<img>` tag).

---

## Phase 3: Pixel Art Generation (Est. 2-3 days)

### Task 3.1: Research Pixelation Technique/Library
- [x] Investigate and select a client-side image pixelation method.
  - [x] **Option 1 (Recommended): Manual pixelation with HTML5 Canvas API.**
    - [x] Load image to offscreen canvas, get `ImageData`.
    - [x] Iterate image in blocks (e.g., 10x10px), calculate average color per block.
    - [x] Draw new rectangles on output canvas with average colors.
  - [ ] **Option 2:** Use a lightweight JS image manipulation library.

### Task 3.2: Implement Album Art Pixelation Logic
- [x] Develop a function/React hook to convert an image URL to pixel art.
  - [x] Inputs: Image URL, pixel block size (e.g., `blockSize = 10`).
  - [x] Output: Data URL of pixelated image or draw to visible canvas.
  - [x] Ensure reasonable performance.

### Task 3.3: Display Generated Pixel Art
- [x] Show the pixelated album art in the UI.
  - [x] Use `<img>` tag for data URL or render to a visible `<canvas>`.

### Task 3.4: Pixelation Controls (Optional but Recommended)
- [x] Add UI (e.g., slider) to control pixelation level (block size).
  - [x] Slider (`<input type="range">`) to adjust `blockSize`.
  - [x] Re-generate and update pixel art on value change.

---

## Phase 4: UI/UX Refinement & Enhancements (Est. 1-2 days)

### Task 4.1: Styling and Layout
- [x] Apply consistent styling for a polished UI using Tailwind CSS. (Partially started with theme colors, now applied more broadly)
  - [x] Ensure responsive design (desktop, tablet, mobile). (Basic side-by-side layout implemented, further refinements made to padding, margins, and element sizing for better responsiveness on `MainAppPage.tsx`)
  - [x] Clean, intuitive layout for song info and pixel art. (Basic side-by-side layout implemented, refined spacing and element sizing on `MainAppPage.tsx`)
  - [x] Improved styling for `LoginPage.tsx` (gradient background, card layout, pixelated logo).

### Task 4.2: Error Handling & Feedback
- [x] Provide clear feedback for loading states, errors (API, pixelation), and no song playing.

### Task 4.3: "Refresh" Functionality
- [x] Add a button to manually re-fetch the currently playing song.
- [x] Implement basic scroll-up-to-refresh on mobile (simulated via wheel event).

### Task 4.4: "Download Pixel Art" Functionality
- [x] Allow users to download generated pixel art (e.g., PNG).
  - [x] Canvas: `canvas.toDataURL('image/png')` and trigger download with an `<a>` tag.
  - [x] Ensured high-resolution download by generating from the full-resolution pixelated canvas.
  - [x] Improved filename to include artist, album, and block size (e.g., `artist_album_pixel_art_block10.png`).

### Task 4.5: Logout Functionality
- [x] Implement a logout button to clear tokens and redirect to login.

### Task 4.6: Final UI Touches
- [x] Updated HTML page title to "Spotify Pixel Art Generator".
- [x] Added a favicon (`favicon.png`) to the `public` folder and linked it in `index.html`.

---

## Phase 5: Deployment (Est. 1 day)

### Task 5.1: Build Optimization
- [~] Prepare for production deployment.
  - [x] Run Vite production build (`npm run build`) as part of deployment. (Build script updated to use `vite build --mode production`, enabling use of `.env.production` for correct redirect URI).
  - [ ] Review bundle sizes and optimizations.

### Task 5.2: Deployment
- [~] Deploy SPA to GitHub Pages.
  - [x] Installed `gh-pages` package.
  - [x] Added `homepage` field to `package.json` (`https://ShanThatos.github.io/spotify-pixel-art-gen-app`).
  - [x] Added `predeploy` (`npm run build`) and `deploy` (`gh-pages -d dist`) scripts to `package.json`.
  - [x] Configured `vite.config.ts`: Set the `base` option to `/spotify-pixel-art-gen-app/`.
  - [x] Created `.env.production` with `VITE_SPOTIFY_REDIRECT_URI=https://ShanThatos.github.io/spotify-pixel-art-gen-app`.
  - [x] Initialized Git repository, committed files, and pushed to GitHub remote.
  - [x] Successfully ran `npm run deploy` to build and deploy the application to the `gh-pages` branch.
  - [ ] Verify deployment and functionality on GitHub Pages: [https://ShanThatos.github.io/spotify-pixel-art-gen-app](https://ShanThatos.github.io/spotify-pixel-art-gen-app)
  - [ ] (User to ensure) Update the `Redirect URI` in the Spotify Developer Dashboard to match `VITE_SPOTIFY_REDIRECT_URI` from `.env.production` (i.e., `https://ShanThatos.github.io/spotify-pixel-art-gen-app`).

---

## Technology Stack Summary

*   **Core:** Vite, React, TypeScript
*   **Routing:** Manual view management in `App.tsx` (no external routing library)
*   **API Interaction:** Native `fetch` or `axios`
*   **Styling:** Tailwind CSS
*   **State Management:** React Context API (initially); consider Zustand or Redux Toolkit for growth.

---

## Key Considerations & Best Practices

*   **Security:** Handle `Client ID` and `code_verifier` securely.
*   **API Rate Limiting:** Be mindful of Spotify API limits.
*   **User Experience:** Prioritize smooth, responsive UX.
*   **Accessibility (a11y):** Develop with accessibility in mind (semantic HTML, ARIA).
*   **Code Quality:** Maintain clean, documented, modular code (ESLint, Prettier).

This project plan provides a comprehensive roadmap. Each task can be broken down further as development progresses. Good luck!




