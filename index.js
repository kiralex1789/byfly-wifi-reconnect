import fs from 'fs';
import puppeteer from 'puppeteer';
import pino from 'pino';


const auth = JSON.parse(fs.readFileSync('auth.json', {encoding: 'utf-8'}));
console.log('Using auth:', auth);


const logFile = './app.log';
console.log('Storing logs into', logFile);

const fileTransport = pino.transport({
    target: 'pino/file',
    options: { destination: logFile },
});
const logger = pino(
    {
        timestamp: pino.stdTimeFunctions.isoTime,
    },
    fileTransport
);


async function checkInternet() {
    try {
        logger.info('Checking internet...');
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        if (data && data.ip) {
            logger.info('Internet is ok');
            return true;
        }
    } catch {
    }
    return false;
}

const sleep = async (sec) => new Promise(r => setTimeout(r, sec * 1000));

async function doByFlyWiFiLogin() {
    console.log('Do ByFly WiFi login...')
    logger.info('Do ByFly WiFi login...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto('https://ciscowifi.beltelecom.by/'); // NOTE: disconnect button: https://ciscowifi.beltelecom.by/connected/
    await page.setViewport({width: 1080, height: 1024});

    await page.waitForSelector('a[href="#have-a-login-pass"]');
    await page.locator('a[href="#have-a-login-pass"]').click();

    await page.waitForSelector('button[id="pay_button_oc"]');
    await sleep(1);
    await page.type('form[action="/connect_by_card/"] input[name="login"]', auth.login);

    const pwdHandle = await page.$('form[action="/connect_by_card/"] input[name="password"]');
    await pwdHandle.type(auth.password);
    await page.screenshot({path: 'byfly-login-1.png'});

    await pwdHandle.press('Enter');

    await sleep(1);

    await page.screenshot({path: 'byfly-login-2.png'});

    await browser.close();
    logger.info('Byfly login done');
}


// entrypoint
(async () => {
    logger.info('Starting');

    while (true) {
        if (!await checkInternet())
            await doByFlyWiFiLogin();
        await sleep(10);
    }
})();
