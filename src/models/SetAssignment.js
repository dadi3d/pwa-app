const mongoose = require('mongoose');

const setNameSchema = new mongoose.Schema({
    name: String
}, { collection: 'set_assignments' });

module.exports = mongoose.model('SetAssignment', setNameSchema);
