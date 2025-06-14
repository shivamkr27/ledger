const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            // Instead of returning 401, just pass through
            next();
            return;
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (jwtError) {
            // For token errors, just pass through - let the route handler handle it
            next();
        }
    } catch (error) {
        // For any other errors, just pass through
        next();
    }
};