const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: String
}, { collection: 'set_categories' });

module.exports = mongoose.model('SetCategory', categorySchema);
