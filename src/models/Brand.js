const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: String
}, { collection: 'manufacturers' });

module.exports = mongoose.model('Brand', brandSchema);
