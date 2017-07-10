// Entry Point !
// Check for node version (7.6+ required)
const [major, minor] = process.versions.node.split('.').map(parseFloat);
if (major < 7 || (major === 7 && minor < 6)) {
  console.log('Node.js version is too old. Please use 7.6 or above');
  process.exit();
}

// Load *variables.env* into proccess.env
require('dotenv').config({ path: 'variables.env' });

const mongoose = require('mongoose');
mongoose.connection.on('error', (err) => {
  console.error(`🙅 🚫 🙅 🚫 🙅 🚫 🙅 🚫 → ${err.message}`);
});

// Import Models

require('./Models/User')

// Launch Server
const app = require('./app');
app.set('port', process.env.PORT || 7777);
const server = app.listen(app.get('port'), () => {
  console.log(`Express running → PORT ${server.address().port}`);
});
