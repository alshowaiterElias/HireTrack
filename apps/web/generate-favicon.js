// Script to generate a simple ICO-compatible PNG favicon
// Run with: node generate-favicon.js  (requires 'sharp' — install with: npm install sharp)

// If you don't want to run this, just copy icon-192.png as favicon.png manually.
// Next.js 13+ picks up app/icon.svg automatically as the tab icon.

// For ICO support (older browsers), place a favicon.ico in public/
// The SVG at app/icon.svg already covers Chrome, Firefox, Safari (modern).

console.log('✅ Next.js will serve app/icon.svg as the browser tab icon automatically.');
console.log('   No build step needed — just redeploy to Vercel.');
