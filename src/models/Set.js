const mongoose = require('mongoose');

const setsSchema = new mongoose.Schema({
    manufacturer: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    set_name: { type: mongoose.Schema.Types.ObjectId, ref: 'SetName' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'SetCategory' },
    set_assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'SetAssignment' },
    set_number: Number,

    // Neue optionale Felder
    thumbnail: String,       // Pfad oder URL zur Bilddatei
    manual: String,          // Pfad oder URL zur PDF
    note_public: { type: String, default: '' },
    note_private: { type: String, default: '' },
    state: { type: mongoose.Schema.Types.ObjectId, ref: 'SetState' },
    insurance_value: { type: Number, default: 0 },
}, { collection: 'sets' });

module.exports = mongoose.model('Set', setsSchema);
