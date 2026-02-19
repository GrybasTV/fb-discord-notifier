const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createClient } = require('@libsql/client');
const crypto = require('crypto');

puppeteer.use(StealthPlugin());

const url = process.argv[2];
const requestId = process.argv[3];

if (!url || !requestId) {
  console.error('Usage: node test-scrape-github.js <url> <request_id>');
  process.exit(1);
}

async function testScrapeAndSave() {
  console.log(`Testing scrape for: ${url}`);
  console.log(`Request ID: ${requestId}`);

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    if (process.env.FB_COOKIES) {
      const cookies = JSON.parse(process.env.FB_COOKIES);
      await page.setCookie(...cookies);
    }

    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const postSelector = '[role="article"]';
    await page.waitForSelector(postSelector, { timeout: 15000 });

    const posts = await page.evaluate(() => {
      const posts = Array.from(document.querySelectorAll('[role="article"]'));
      const realPosts = posts.filter((p) => {
        const elem = p;
        return elem.innerText && elem.innerText.length > 50;
      });

      return realPosts.slice(0, 3).map((post) => {
        const elem = post;
        const linkTag = Array.from(post.querySelectorAll('a')).find(
          (a) => a.href.includes('/posts/') || a.href.includes('pfbid') || a.href.includes('/reel/')
        );
        const postUrl = linkTag ? linkTag.href.split('?')[0] : null;

        const textElement =
          post.querySelector('[data-ad-preview="message"]') ||
          post.querySelector('[data-testid="post_message"]');
        const text = textElement
          ? textElement.innerText
          : elem.innerText.substring(0, 200) + '...';

        const imgElement = post.querySelector('img[src*="fbcdn"]');
        const imageUrl = imgElement ? imgElement.src : null;

        return {
          postUrl,
          text: text.substring(0, 500),
          imageUrl,
        };
      });
    });

    console.log(`Found ${posts.length} posts`);

    // Save results to database
    await db.execute({
      sql: `
        UPDATE test_scrape_requests
        SET status = ?, posts = ?, completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: ['completed', JSON.stringify(posts), requestId],
    });

    console.log('Results saved to database');
  } catch (error) {
    console.error('Error:', error.message);

    // Save error to database
    await db.execute({
      sql: `
        UPDATE test_scrape_requests
        SET status = ?, posts = ?, completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: ['error', JSON.stringify({ error: error.message }), requestId],
    });
  } finally {
    await browser.close();
  }
}

testScrapeAndSave();
