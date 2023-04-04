require('dotenv').config();

const User = require('../models/user');

User.init()
  .then(() => {
    console.log('User: initialization complete');
    process.exit(0);
  })
  .catch(err => {
    console.error(err)
    process.exit(1);
  });