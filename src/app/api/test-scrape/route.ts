import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await req.json();

  if (!url) {
    return NextResponse.json({ error: "Nenurodytas URL" }, { status: 400 });
  }

  // Validate Facebook URL
  if (!url.includes("facebook.com") && !url.includes("fb.watch")) {
    return NextResponse.json({ error: "Tinkamas Facebook URL" }, { status: 400 });
  }

  // Get FB_COOKIES from environment (set in Vercel)
  const fbCookies = process.env.FB_COOKIES;

  if (!fbCookies) {
    return NextResponse.json(
      { error: "Nenurodyti FB_COOKIES environment variable" },
      { status: 500 }
    );
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Set cookies
    const cookies = JSON.parse(fbCookies);
    await page.setCookie(...cookies);

    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Wait for posts
    const postSelector = '[role="article"]';
    await page.waitForSelector(postSelector, { timeout: 15000 });

    // Get last 3 posts
    const posts = await page.evaluate(() => {
      const posts = Array.from(document.querySelectorAll('[role="article"]'));
      // Filter only real posts with actual text
      const realPosts = posts.filter((p) => {
        const elem = p as HTMLElement;
        return elem.innerText && elem.innerText.length > 50;
      });

      return realPosts.slice(0, 3).map((post) => {
        const elem = post as HTMLElement;
        const linkTag = Array.from(post.querySelectorAll("a")).find(
          (a) => a.href.includes("/posts/") || a.href.includes("pfbid") || a.href.includes("/reel/")
        );
        const postUrl = linkTag ? linkTag.href.split("?")[0] : null;

        const textElement =
          post.querySelector('[data-ad-preview="message"]') ||
          post.querySelector('[data-testid="post_message"]');
        const text = textElement
          ? (textElement as HTMLElement).innerText
          : elem.innerText.substring(0, 200) + "...";

        const imgElement = post.querySelector('img[src*="fbcdn"]') as HTMLImageElement;
        const imageUrl = imgElement ? imgElement.src : null;

        return {
          postUrl,
          text: text.substring(0, 500),
          imageUrl,
        };
      });
    });

    await browser.close();

    return NextResponse.json({
      success: true,
      posts,
      message: `Rasti ${posts.length} paskutiniai įrašai`,
    });
  } catch (error: unknown) {
    if (browser) {
      await browser.close();
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Test scrape error:", message);
    return NextResponse.json(
      {
        error: "Nepavyko nuskaityti Facebook puslapio: " + message,
        note: "Ši funkcija veikia tik lokaliai su Puppeteer. Vercel deployment reikalautų išorinės browser service.",
      },
      { status: 500 }
    );
  }
}
