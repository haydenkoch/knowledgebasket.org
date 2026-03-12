# Landscape images (placeholders)

Placeholder images for event cards and heroes when no image is set.

## Responsive images (recommended)

1. **Add source images**  
   Put your original JPG/PNG/WebP files in:
   ```
   static/images/landscapes/source/
   ```

2. **Process**  
   From the project root:
   ```bash
   npm run images:process
   ```
   This uses [Sharp](https://sharp.pixelplumbing.com/) to generate:
   - Multiple widths: 320, 640, 960, 1280, 1920 px
   - WebP for modern browsers
   - 960 px JPG fallback for older browsers
   - A manifest used by the app for `srcset` / `sizes`

3. **Output**  
   Processed files are written under:
   ```
   static/images/landscapes/320/  ... 1920/
   ```
   Each width folder contains `{slug}.webp`; `960/` also has `{slug}.jpg`.  
   The app then serves the right size per device (card vs hero, viewport).

## Legacy (no processing)

If you don’t run `images:process`, the app falls back to single URLs like  
`/images/landscapes/Your File Name.jpg`.  
Put those files directly in `static/images/landscapes/` for the legacy list in `placeholders.ts`.
