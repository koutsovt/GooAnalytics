import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.createContext({ viewport: { width: 1280, height: 1024 } });
const page = await context.newPage();

try {
  // Navigate to dashboard (will redirect to login if not authenticated)
  console.log('Loading dashboard...');
  await page.goto('http://localhost:3000/dashboard', { 
    waitUntil: 'networkidle', 
    timeout: 10000 
  }).catch(e => console.log('Navigation note:', e.message));
  
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/dashboard.png', fullPage: false });
  console.log('✓ Screenshot saved: /tmp/dashboard.png');
  
  // Get page title and URL
  console.log('Final URL:', page.url());
  console.log('Title:', await page.title());
} catch (e) {
  console.log('Error:', e.message);
}

await browser.close();
