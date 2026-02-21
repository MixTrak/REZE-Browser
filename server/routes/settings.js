const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/user/settings
router.post('/', async (req, res) => {
    try {
        const { userId, googleApiKey, cseId, openRouterApiKey, openRouterModel } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const updateData = {
            googleApiKey,
            cseId,
            openRouterApiKey,
            openRouterModel,
        };

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true } // returns the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Settings update error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
