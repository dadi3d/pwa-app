const mongoose = require('mongoose');

const setNameSchema = new mongoose.Schema({
    name: String
}, { collection: 'set_states' });

module.exports = mongoose.model('SetState', setNameSchema);
