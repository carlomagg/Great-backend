const express = require('express');
const { body, param } = require('express-validator');
const validate = require('./middleware/validate');
const EventController = require('./controllers/EventController');

const router = express.Router();
const eventController = new EventController();

// Initialize event
router.post('/initialize',
  [
    body('totalTickets').isInt({ min: 1 }).withMessage('Total tickets must be a positive integer')
  ],
  validate,
  eventController.initialize
);

// Book ticket
router.post('/book',
  [
    body('eventId').isInt().withMessage('Event ID must be an integer'),
    body('userId').isString().notEmpty().withMessage('User ID is required')
  ],
  validate,
  eventController.book
);

// Cancel booking
router.post('/cancel',
  [
    body('eventId').isInt().withMessage('Event ID must be an integer'),
    body('userId').isString().notEmpty().withMessage('User ID is required')
  ],
  validate,
  eventController.cancel
);

// Get event status
router.get('/status/:eventId',
  [
    param('eventId').isInt().withMessage('Event ID must be an integer')
  ],
  validate,
  eventController.getStatus
);

module.exports = router;
