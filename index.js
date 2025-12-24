const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🚀 Scraper API is running");
});

app.post("/scrape", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000, // 30 sec timeout
    });

    const data = await page.evaluate(() => {
      const uniqueText = new Set();

      const headings = Array.from(
        document.querySelectorAll("h1, h2, h3, h4, h5, h6")
      )
        .map(h => h.innerText.trim())
        .filter(Boolean);

      document.querySelectorAll("p, span, div").forEach(el => {
        const text = el.innerText.trim();
        if (text.length > 30) uniqueText.add(text);
      });

      const links = Array.from(document.querySelectorAll("a"))
        .map(a => ({
          text: a.innerText.trim(),
          url: a.href,
        }))
        .filter(l => l.url);

      return {
        title: document.title,
        headings,
        text: Array.from(uniqueText),
        links,
      };
    });

    await browser.close();
    res.json(data);

  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Scraper API running on port ${PORT}`);
});
