const mongoose = require('mongoose');

const singleProductSchema = new mongoose.Schema({
    set: { type: mongoose.Schema.Types.ObjectId, ref: 'Set' },
    Manufacturer: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    Type: String,
    Designation: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory' },
    SerialNumber: String,
    CostCenter: String,
    Department: String,
    CustomerID: Number,
    Various_1: Number,
    Status: { type: String, default: 'aktiv' },
    DeviceType: { type: String, default: 'Normal' },
    IsActive: { type: Boolean, default: false },
    TestingInterval: { type: Number, default: 24 },
    ID: Number,
    LastTestingDate: Date,
    Remark: String,
    state: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductState' },
}, { collection: 'products' });

module.exports = mongoose.model('SingleProduct', singleProductSchema);
