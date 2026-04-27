import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export async function launchBrowser() {
  const executablePath = await chromium.executablePath();

  console.log("Using Chromium executable:", executablePath);

  return puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });
}