const puppeteer = require('puppeteer');
const path = require('node:path');
const fs = require('fs').promises;
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

// ============================================================================
// Edit your environment domains and test paths below
// ============================================================================

const environmentOne = {
    'label': 'prod',
    'base': 'https://www.libertyspecialtymarkets.com'
}
const environmentTwo = {
    'label': 'uat',
    'base': 'https://www.uat-euw.lsm-dudhep.com'
}
const urls = [
    '/gb-en',
    '/gb-en/about-us/our-people'
];
// ============================================================================
// ============================================================================



async function emptyDir(dirPath) {
    try {
        const files = await fs.readdir(dirPath);

        const deleteFilePromises = files.map(file =>
        fs.unlink(path.join(dirPath, file)),
        );

        await Promise.all(deleteFilePromises);
    } catch (err) {
        console.log(err);
    }
}

async function saveScreenshot(puppeteerPage, environment, url) {
    outfile = `screenshots/${path.basename(url)}_${environment.label}.png`;
    url = `${environment.base}${url}`
    
    console.log(`[INFO] Fetching URL: ${url}`);
    try {
        await puppeteerPage.goto(url, { waitUntil: 'networkidle0' });
    } catch (err) {
        console.log(err);
    }

    console.log(`[INFO] Saving screenshot to: ${outfile}`);
    try {
        await puppeteerPage.screenshot({
            // fullPage: true,
            path: outfile,
            clip: {
                x: 0,
                y: 0,
                width: 1280,
                height: 5000
            }
        });
    } catch (err) {
        console.log(err);
    }

    return outfile;
}

(async () => {

    await emptyDir('./screenshots').then(() => {
        console.log('[INFO] Emptied screenshots directory.');
    });

    const proxyUrl = 'socks4://127.0.0.1:8889';
    const browser = await puppeteer.launch({
        args: [`--proxy-server=${proxyUrl}`],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    for (var i=0, n=urls.length; i < n; ++i){
        outfileOne = await saveScreenshot(page, environmentOne, urls[i]);
        outfileTwo = await saveScreenshot(page, environmentTwo, urls[i]);

        imgOne = PNG.sync.read(await fs.readFile(outfileOne));
        imgTwo = PNG.sync.read(await fs.readFile(outfileTwo));

        let {width, height} = imgTwo;
        let diff = new PNG({width, height});

        console.log(`[INFO] Comparing screenshots for: ${urls[i]}`);
        pixelmatch(imgOne.data, imgTwo.data, diff.data, width, height, {threshold: 0.5});
        
        let diffFile = `screenshots/diff_${path.basename(urls[i])}.png`;
        console.log(`[INFO] Saving diff to: ${diffFile}`);
        await fs.writeFile(diffFile, PNG.sync.write(diff));
    }

    await browser.close();
})();