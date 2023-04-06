require('dotenv').config();

const User = require('../models/user');

// Building the indexes for 'User' so duplicate key error
// on email can work reliably
User.init()
  .then(() => {
    console.log('User: initialization complete');
    process.exit(0);
  })
  .catch(err => {
    console.error(err)
    process.exit(1);
  });