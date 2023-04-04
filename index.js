if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const PORT = process.env.PORT || 3000;
const app = require('./app');

app.listen(PORT, () => {
  console.log('Packer server is listening on port', PORT);
});