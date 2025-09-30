const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: String
}, { collection: 'product_categories' });

module.exports = mongoose.model('ProductCategory', categorySchema);
