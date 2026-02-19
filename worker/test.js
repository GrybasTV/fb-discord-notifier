const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
require('dotenv').config();

puppeteer.use(StealthPlugin());

async function testScrape(url, postIndex = 0) {
  console.log(`Testinis skenavimas: ${url}, postIndex: ${postIndex}`);
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  try {
    if (process.env.FB_COOKIES) {
      const cookies = JSON.parse(process.env.FB_COOKIES);
      await page.setCookie(...cookies);
    }

    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Palaukiame įrašų
    const postSelector = '[role="article"]';
    await page.waitForSelector(postSelector, { timeout: 15000 });

    const postInfo = await page.evaluate((index) => {
      const posts = Array.from(document.querySelectorAll('[role="article"]'));
      // Filtruojame tik tuos, kurie turi realų tekstą (kad skipintume reklamas ar "suggested")
      const realPosts = posts.filter(p => p.innerText && p.innerText.length > 50);
      
      const targetPost = realPosts[index];
      if (!targetPost) return null;

      const linkTag = Array.from(targetPost.querySelectorAll('a')).find(a => a.href.includes('/posts/') || a.href.includes('pfbid'));
      const postUrl = linkTag ? linkTag.href.split('?')[0] : null;
      
      const textElement = targetPost.querySelector('[data-ad-preview="message"]') || targetPost.querySelector('[data-testid="post_message"]');
      const text = textElement ? textElement.innerText : targetPost.innerText.substring(0, 200) + "...";

      const imgElement = targetPost.querySelector('img[src*="fbcdn"]');
      const imageUrl = imgElement ? imgElement.src : null;

      return { postUrl, text: text.substring(0, 500), imageUrl };
    }, postIndex);

    console.log("Rastas įrašas:", postInfo);
  } catch (err) {
    console.error("Klaida:", err.message);
  } finally {
    await browser.close();
  }
}

// Paleidžiame testą su Slavka Channel, imam antrą įrašą (index 1)
testScrape('https://www.facebook.com/SlavkaChannel/', 1);
