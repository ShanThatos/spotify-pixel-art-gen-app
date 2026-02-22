# Spotify Pixel Art Generator 🎨🎶

Pixelate your currently playing Spotify song

Trying it out here: [https://shanthatos.github.io/spotify-pixel-art-gen-app/](https://shanthatos.github.io/spotify-pixel-art-gen-app/)

## Local Development

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Set up environment variables:**
    Copy the file `copy.env` and rename the copy to `.env.local`

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

## Deployment
Copy the file `copy.env` and rename the copy to `.env.production`
Change the contents of the `.env.production` file to match:
```env
VITE_SPOTIFY_CLIENT_ID=<whatever's there>
VITE_SPOTIFY_REDIRECT_URI=https://shanThatos.github.io/spotify-pixel-art-gen-app
```
```bash
npm run deploy
```
