const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    googleApiKey: { type: String, default: '' },
    cseId: { type: String, default: '' },
    openRouterApiKey: { type: String, default: '' },
    openRouterModel: { type: String, default: 'stepfun/step-3.5-flash:free' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
