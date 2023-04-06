const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function download(url) {
  const fileName = path.basename(url);
  const filePath = path.resolve('files', fileName)
  const writer = fs.createWriteStream(filePath)

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

module.exports = download;