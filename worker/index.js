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
      
      // Filter for articles that actually look like posts (usually have a timestamp or specific text length)
      const actualPosts = articles.filter(art => {
        const text = art.innerText || "";
        // Posts usually have some content and a link to /posts/ or pfbid
        const hasPostLink = !!art.querySelector('a[href*="/posts/"], a[href*="pfbid"]');
        return text.length > 20 && hasPostLink;
      });

      const firstPost = actualPosts[0];
      if (!firstPost) return null;

      // Try to find the link/ID
      const linkTag = Array.from(firstPost.querySelectorAll('a')).find(a => a.href.includes('/posts/') || a.href.includes('pfbid'));
      const postUrl = linkTag ? linkTag.href.split('?')[0] : null;
      
      // Text content - try multiple common FB selectors
      const textSelectors = [
        '[data-ad-preview="message"]',
        '[data-testid="post_message"]',
        '.x1iorvi4.x1pi3ozi.x1swvt1m', // Common FB post text class
        'div[dir="auto"]'
      ];
      
      let text = "";
      for (const selector of textSelectors) {
        const el = firstPost.querySelector(selector);
        if (el && el.innerText) {
          text = el.innerText;
          break;
        }
      }

      // If no specific text element found, take a snippet of the article innerText
      if (!text) {
        text = firstPost.innerText.substring(0, 500);
      }

      // Image
      const imgElement = firstPost.querySelector('img[src*="fbcdn"]');
      const imageUrl = imgElement ? imgElement.src : null;

      return { postUrl, text, imageUrl };
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
  
  const res = await db.execute("SELECT * FROM monitored_pages WHERE status = 'active'");
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
      
      if (postInfo.postUrl !== pageRow.last_post_id) {
        console.log(`New post found for ${pageRow.name}: ${postInfo.postUrl}`);
        
        await sendDiscordNotification(
          pageRow.discord_webhook_url,
          pageRow.name || "Facebook Puslapis",
          postInfo.postUrl,
          postInfo.text,
          postInfo.imageUrl
        );

        // Update DB
        await db.execute({
          sql: "UPDATE monitored_pages SET last_post_id = ?, last_checked = CURRENT_TIMESTAMP WHERE id = ?",
          args: [postInfo.postUrl, pageRow.id]
        });
      } else {
        console.log(`No new posts for ${pageRow.name}.`);
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
