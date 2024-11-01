const puppeteer = require("puppeteer-extra");
const stealthPlugin = require("puppeteer-extra-plugin-stealth")();
const { executablePath } = require('puppeteer');
const chromePaths = require('chrome-paths');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

puppeteer.use(stealthPlugin);

const chromePath = chromePaths.chrome;


async function loadCookiesFromFile() {
  try {
    // Read the cookie file
    const filePath = path.join(__dirname, 'cookie.txt');
    const cookieData = await fs.readFile(filePath, 'utf-8');
    const cookies = cookieData.split('; ').map(cookie => {
      const [name, ...valueParts] = cookie.split('=');
      return {
        name,
        value: valueParts.join('='),
        domain: 'www.nhatot.com',  // Specify the domain for the cookies
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      };
    });
    return cookies;
  } catch (error) {
    console.error("Failed to load cookies from file:", error);
    return [];
  }
}

async function getPhoneNumber(postId) {
  const postUrl = `https://www.nhatot.com/${postId}.htm`;

  const browser = await puppeteer.launch({
            executablePath: chromePath,
            headless: true,
            args: [
              '--window-size=400,1000'
            ],
          });
  try{
    const page = (await browser.pages())[0];
    
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    );

    // Split and map each cookie string to the format required by Puppeteer
    const cookies = await loadCookiesFromFile()
    
    // Set all cookies on the page
    await page.setCookie(...cookies);

    await page.goto(postUrl, { waitUntil: 'networkidle2' });

    // Add a general wait for a known element on the page to ensure it's fully loaded
    await page.waitForSelector('[class^="InlineShowPhoneButton"]', { timeout: 10000 });


    var phoneNumber = '';
    page.on('response', async (response) => {
      // Log the response data
      const url = response.url();
      if (response.url().includes('/phone?')) {
        const responseText = await response.text();
        console.log('responseText: ' + responseText);
        try {
          phoneNumber = JSON.parse(responseText)['phone'];
        } catch {
          phoneNumber = '';
        }
      }
    });

    var btnGetPhone = await page.waitForSelector(
      '[class^="InlineShowPhoneButton"] button',
      { timeout: 5000 }
    );

    console.log(btnGetPhone)
    await btnGetPhone.click();
    await page.waitForTimeout(700);
    await browser.close();
    console.log(phoneNumber);
    return phoneNumber;
  } catch (err) {
    console.log(err);
    await browser.close();
    deletePhoneNumber(postId);
    return null;
  }
}

async function getListIds(numberIds = 5) {
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'http://103.69.84.133:3800/chotot_post_ids',
    headers: {},
  };

  return axios
    .request(config)
    .then((response) => {
      const dataResponses = response.data.post_ids.slice(
        0,
        numberIds
      );
      console.log(
        '🚀 ~ file: index.js:21 ~ .then ~ dataResponses:',
        dataResponses
      );
      return dataResponses;
    })
    .catch((error) => {
      console.log(error);
      return [];
    });
}

async function updatePhoneNumber(chotot_post_id) {
  var phone = await getPhoneNumber(chotot_post_id);
  if (phone == null) return;
  let data = JSON.stringify({
    chotot_post_id: chotot_post_id,
    phone: phone,
  });

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'http://103.69.84.133:3800/update_chotot_post',
    headers: {
      'Content-Type': 'application/json',
    },
    data: data,
  };

  axios
    .request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      console.log(error);
    });
}

async function deletePhoneNumber(postId) {
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `http://103.69.84.133:3800/delete_chotot_post?chotot_post_id=${postId}`,
    headers: {},
  };

  axios
    .request(config)
    .then((response) => {
      console.log('deletePhoneNumber success');
      console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      console.log('deletePhoneNumber error');
      console.log(error);
    });
}

async function test_run() {
  postId = '120626246'
  await updatePhoneNumber(postId);
}

async function run() {
  while (true) {
    const postIds = await getListIds(10);
    // const postIds = ['107864656']
    console.log('🚀 ~ file: index.js:90 ~ run ~ postIds:', postIds);

    for (let i = 0; i < postIds.length; i++) {
      try {
        var postId = postIds[i];
        console.log(
          '🚀 ~ file: index.js:114 ~ run ~ postId:',
          postId
        );
        await updatePhoneNumber(postId);
      } catch (err) {
        console.log(err);
      }
    }
  }
}

run();
