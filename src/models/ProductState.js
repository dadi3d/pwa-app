const mongoose = require('mongoose');

const setNameSchema = new mongoose.Schema({
    name: String
}, { collection: 'product_states' });

module.exports = mongoose.model('ProductState', setNameSchema);
