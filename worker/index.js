const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createClient } = require('@libsql/client');
const axios = require('axios');
require('dotenv').config();

puppeteer.use(StealthPlugin());

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function sendDiscordNotification(webhookUrl, pageName, postUrl, text, imageUrl) {
  const payload = {
    embeds: [{
      title: `Naujas įrašas: ${pageName}`,
      url: postUrl,
      description: text.substring(0, 1000),
      color: 3447003, // Blue
      timestamp: new Date().toISOString(),
      image: imageUrl ? { url: imageUrl } : null,
      footer: { text: "FB Notifier" }
    }]
  };

  try {
    await axios.post(webhookUrl || process.env.DISCORD_WEBHOOK_URL, payload);
    console.log(`Notification sent for ${pageName}`);
  } catch (error) {
    console.error(`Error sending Discord notification for ${pageName}:`, error.message);
  }
}

async function scrapePage(browser, pageData) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  
  try {
    // Set cookies if available
    if (process.env.FB_COOKIES) {
      const cookies = JSON.parse(process.env.FB_COOKIES);
      await page.setCookie(...cookies);
    }

    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(pageData.url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for the first post
    // Facebook uses dynamic classes, but data-testid="post_message" or specific structure remains
    // We'll try common selectors
    const postSelector = '[role="article"]';
    await page.waitForSelector(postSelector, { timeout: 10000 });

    const postInfo = await page.evaluate(() => {
      // Find all articles
      const articles = Array.from(document.querySelectorAll('[role="article"]'));
      
      const now = new Date();
      // User request: 1 hour threshold as scraper runs every 30 mins
      const ONE_HOUR_MS = 60 * 60 * 1000;

      // Helper to parse relative time or date
      const parseFacebookDate = (dateStr) => {
        if (!dateStr) return null;
        dateStr = dateStr.toLowerCase().trim();
        
        // Relative time: "2 h", "2 val.", "5 min", "Just now"
        if (dateStr.includes('just now') || dateStr.includes('ką tik')) return new Date();
        
        const timeMatch = dateStr.match(/(\d+)\s*(m|min|h|val|d)/);
        if (timeMatch) {
            const val = parseInt(timeMatch[1]);
            const unit = timeMatch[2];
            const d = new Date();
            if (unit.startsWith('m')) d.setMinutes(d.getMinutes() - val);
            if (unit.startsWith('h') || unit.startsWith('v')) d.setHours(d.getHours() - val);
            if (unit.startsWith('d')) d.setDate(d.getDate() - val);
            return d;
        }

        // Absolute date: "20 January at 12:00", "Yesterday at 10:00"
        if (dateStr.includes('yesterday') || dateStr.includes('vakar')) {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return d; // Approximate time is fine for >24h check
        }
        
        // Try parsing direct date string
        const parsed = Date.parse(dateStr);
        if (!isNaN(parsed)) return new Date(parsed);

        return null; 
      };

      for (const art of articles) {
        const textEl = art.querySelector('[data-ad-preview="message"]') || 
                       art.querySelector('[data-testid="post_message"]') || 
                       art.querySelector('div[dir="auto"]');
        
        // Find links that look like timestamps
        const allLinks = Array.from(art.querySelectorAll('a'));
        const timeLink = allLinks.find(a => {
            const href = a.getAttribute('href') || "";
            const text = a.innerText.trim();
            // Link to post/video/reel + short text
            return (href.includes('/posts/') || href.includes('/videos/') || href.includes('/reel/') || href.includes('pfbid')) &&
                   text.length > 0 && text.length < 30 &&
                   !href.includes('/hashtag/'); 
        });

        if (!timeLink) continue; // Skip if we can't find a timestamp/link

        const postDate = parseFacebookDate(timeLink.innerText);
        const isOld = postDate && (now - postDate > ONE_HOUR_MS);

        if (isOld) {
            // Found a post, but it's old (older than 1h). 
            // If it's the very first post, it might be Pinned. Continue searching.
            continue; 
        }

        // Found a fresh post!
        const postUrl = timeLink.href.split('?')[0];
        const text = textEl ? textEl.innerText : art.innerText.substring(0, 500);
        const imgElement = art.querySelector('img[src*="fbcdn"]');
        const imageUrl = imgElement ? imgElement.src : null;

        return { postUrl, text, imageUrl };
      }

      return null; // No fresh posts found
    });

    if (!postInfo || !postInfo.postUrl) {
      throw new Error("Could not extract post info");
    }

    return postInfo;

  } finally {
    await page.close();
    await context.close();
  }
}

async function run() {
  console.log("Starting scraper at", new Date().toLocaleString());
  
  const res = await db.execute(`
    SELECT mp.*, u.default_discord_webhook_url
    FROM monitored_pages mp
    JOIN users u ON mp.user_id = u.id
    WHERE mp.status = 'active'
  `);
  const pagesToScrape = res.rows;

  if (pagesToScrape.length === 0) {
    console.log("No active pages to scrape.");
    return;
  }

  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const pageRow of pagesToScrape) {
    console.log(`Scraping ${pageRow.name || pageRow.url}...`);
    try {
      const postInfo = await scrapePage(browser, pageRow);

      // Use last_viewed_post_url to check if there's a new post
      // If last_viewed is null, use last_post_id as fallback
      const lastViewed = pageRow.last_viewed_post_url || pageRow.last_post_id;

      if (postInfo.postUrl !== lastViewed) {
        console.log(`New post found for ${pageRow.name}: ${postInfo.postUrl} (last viewed: ${lastViewed || 'none'})`);

        // Prioritetas: 1. Puslapio webhook, 2. Globalus vartotojo webhook, 3. .env webhook
        const webhookUrl = pageRow.discord_webhook_url || pageRow.default_discord_webhook_url || process.env.DISCORD_WEBHOOK_URL;

        await sendDiscordNotification(
          webhookUrl,
          pageRow.name || "Facebook Puslapis",
          postInfo.postUrl,
          postInfo.text,
          postInfo.imageUrl
        );

        // Update both last_post_id and last_viewed_post_url
        await db.execute({
          sql: "UPDATE monitored_pages SET last_post_id = ?, last_viewed_post_url = ?, last_checked = CURRENT_TIMESTAMP WHERE id = ?",
          args: [postInfo.postUrl, postInfo.postUrl, pageRow.id]
        });
      } else {
        console.log(`No new posts for ${pageRow.name} (already viewed: ${lastViewed})`);
        await db.execute({
          sql: "UPDATE monitored_pages SET last_checked = CURRENT_TIMESTAMP WHERE id = ?",
          args: [pageRow.id]
        });
      }

    } catch (error) {
      console.error(`Failed to scrape ${pageRow.url}:`, error.message);
      await db.execute({
        sql: "UPDATE monitored_pages SET status = 'error', last_checked = CURRENT_TIMESTAMP WHERE id = ?",
        args: [pageRow.id]
      });
    }
  }

  await browser.close();
  console.log("Scraper finished.");
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
