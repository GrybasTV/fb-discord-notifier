const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
require('dotenv').config();

puppeteer.use(StealthPlugin());

async function validateCookies() {
  console.log("Tikrinami FB_COOKIES...");
  
  if (!process.env.FB_COOKIES) {
    console.error("KLAIDA: .env faile nėra FB_COOKIES kintamojo.");
    return;
  }

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  try {
    const cookies = JSON.parse(process.env.FB_COOKIES);
    await page.setCookie(...cookies);
    
    // Bandome užkrauti FB nustatymų puslapį (kuris tikrai reikalauja login)
    await page.goto('https://www.facebook.com/settings', { waitUntil: 'networkidle2' });
    
    const url = page.url();
    if (url.includes('settings')) {
      console.log("✅ SĖKMĖ: Slapukai veikia! Tu esi prisijungęs.");
    } else if (url.includes('login')) {
      console.log("❌ KLAIDA: Slapukai nebegalioja arba neteisingi (nukreipta į login).");
    } else {
      console.log("❓ NEAIŠKU: Nukreipta į " + url);
    }
  } catch (err) {
    console.error("KLAIDA tikrinant:", err.message);
  } finally {
    await browser.close();
  }
}

validateCookies();
