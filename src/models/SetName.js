const mongoose = require('mongoose');

const setNameSchema = new mongoose.Schema({
    name: String
}, { collection: 'set_names' });

module.exports = mongoose.model('SetName', setNameSchema);
