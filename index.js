const puppeteer = require("puppeteer-extra");
const stealthPlugin = require("puppeteer-extra-plugin-stealth")();
const { executablePath } = require('puppeteer')
const chromePaths = require('chrome-paths');
const fs = require('fs');
const axios = require('axios');

puppeteer.use(stealthPlugin);

async function getPhoneNumber(postId){
  const postUrl = `https://www.nhatot.com/${postId}.htm`
  var chromePath = chromePaths.chrome

  const browser = await puppeteer.launch({
            executablePath: chromePath,
            headless: true,
            args: [
              '--window-size=400,1000'
            ],
          });
  try{
    const page = (await browser.pages())[0];
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36');
    await page.goto(postUrl);
    var phoneNumber = ""
    page.on('response', async (response) => {
      // Log the response data
      const url = response.url();
      if(response.url().includes("/phone?")){
        const responseText = await response.text();
        try{ phoneNumber = JSON.parse(responseText)['phone'] }catch{phoneNumber = ""}
      }
    });

    var btnGetPhone = await page.waitForSelector('[class^="InlineShowPhoneMobile"]',{timeout: 5000});
    await btnGetPhone.click();
    await page.waitForTimeout(700);
    await browser.close()
    console.log(phoneNumber)
    return phoneNumber
  }catch(err){
    console.log(err)
    await browser.close()
    return 9999999999
  }
}

async function getListIds(numberIds = 5){
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'http://194.233.80.128:4000/chotot_post_ids',
    headers: { }
  };

  return axios.request(config)
  .then((response) => {
    const dataResponses = response.data.post_ids.slice(0, numberIds)
    console.log("🚀 ~ file: index.js:21 ~ .then ~ dataResponses:", dataResponses)
    return dataResponses
  })
  .catch((error) => {
    console.log(error);
    return []
  });
}

async function updatePhoneNumber(chotot_post_id){
  var phone = await getPhoneNumber(chotot_post_id)
  if(phone == null) return
  let data = JSON.stringify({
    "chotot_post_id": chotot_post_id,
    "phone": phone
  });

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'http://194.233.80.128:4000/update_chotot_post',
    headers: { 
      'Content-Type': 'application/json'
    },
    data : data
  };

  axios.request(config)
  .then((response) => {
    console.log(JSON.stringify(response.data));
  })
  .catch((error) => {
    console.log(error);
  });

}

async function run(){
  while(true){
    const postIds = await getListIds(10)
    console.log("🚀 ~ file: index.js:90 ~ run ~ postIds:", postIds)

    for( let i = 0 ; i < postIds.length ; i ++){
      var postId = postIds[i]
      console.log("🚀 ~ file: index.js:114 ~ run ~ postId:", postId)
      await updatePhoneNumber(postId)
    }
  }
}

run()