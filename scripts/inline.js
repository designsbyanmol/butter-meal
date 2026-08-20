const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");

const distDir = path.join(__dirname, "..", "dist");
const indexPath = path.join(distDir, "index.html");

async function inlineAssets() {
  try {
    console.log("📦 Inlining assets into index.html...");
    
    if (!await fs.pathExists(indexPath)) {
      console.error("&#10060; index.html not found in dist folder");
      process.exit(1);
    }
    
    let html = await fs.readFile(indexPath, "utf8");
    const $ = cheerio.load(html);
    
    // Remove preload links
    $('link[rel="modulepreload"]').remove();
    
    // Inline CSS
    const cssLinks = $('link[rel="stylesheet"]');
    for (let i = 0; i < cssLinks.length; i++) {
      const link = cssLinks[i];
      const href = $(link).attr("href");
      if (href && !href.startsWith("http") && !href.startsWith("//")) {
        const cssPath = path.join(distDir, href);
        if (await fs.pathExists(cssPath)) {
          const cssContent = await fs.readFile(cssPath, "utf8");
          $(link).replaceWith(`<style>${cssContent}</style>`);
          await fs.remove(cssPath);
          console.log(`  &#9989; Inlined CSS: ${path.basename(href)}`);
        }
      }
    }
    
    // Inline JS - wrap in DOMContentLoaded to ensure DOM is ready
    const scripts = $('script[src]');
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      const src = $(script).attr("src");
      if (src && !src.startsWith("http") && !src.startsWith("//")) {
        const jsPath = path.join(distDir, src);
        if (await fs.pathExists(jsPath)) {
          let jsContent = await fs.readFile(jsPath, "utf8");
          // Wrap in DOMContentLoaded to ensure DOM is ready
          const wrappedContent = `(function(){
            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", function() {
                ${jsContent}
              });
            } else {
              ${jsContent}
            }
          })();`;
          const newScript = $(script).clone();
          newScript.removeAttr("type");
          newScript.removeAttr("src");
          newScript.text(wrappedContent);
          $(script).replaceWith(newScript);
          await fs.remove(jsPath);
          console.log(`  &#9989; Inlined JS: ${path.basename(src)}`);
        }
      }
    }
    
    // Clean up empty assets folder
    const assetsDir = path.join(distDir, "assets");
    if (await fs.pathExists(assetsDir)) {
      const remaining = await fs.readdir(assetsDir);
      if (remaining.length === 0) {
        await fs.remove(assetsDir);
        console.log("  🗑&#65039; Removed empty assets directory");
      }
    }
    
    // Save the inlined HTML
    const finalHtml = $.html();
    await fs.writeFile(indexPath, finalHtml);
    
    const stats = await fs.stat(indexPath);
    console.log(`&#9989; Build complete! Single file: dist/index.html`);
    console.log(`📄 Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`🌐 To preview, run: npm run preview`);
  } catch (error) {
    console.error("&#10060; Error inlining assets:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

inlineAssets();
