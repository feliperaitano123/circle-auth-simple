"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
function handler(_req, res) {
    res.status(200).json({
        status: 'healthy',
        service: 'Circle Auth Simple',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
}
