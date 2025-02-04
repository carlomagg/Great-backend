const db = require('../database/db');
const logger = require('../utils/logger');
const { NotFoundError, ConflictError } = require('../utils/errors');

class EventController {
  async initialize(req, res, next) {
    try {
      const { totalTickets } = req.body;
      
      const [eventId] = await db('events').insert({
        total_tickets: totalTickets,
        available_tickets: totalTickets
      });

      logger.info(`Event initialized with ID: ${eventId}`);
      res.status(201).json({ eventId, totalTickets });
    } catch (error) {
      next(error);
    }
  }

  async book(req, res, next) {
    const { eventId, userId } = req.body;
    const trx = await db.transaction();

    try {
      const event = await trx('events')
        .where('id', eventId)
        .first();

      if (!event) {
        throw new NotFoundError('Event not found');
      }

      // Check for existing booking
      const existingBooking = await trx('bookings')
        .where({ event_id: eventId, user_id: userId })
        .whereNot('status', 'cancelled')
        .first();

      if (existingBooking) {
        throw new ConflictError('User already has a booking for this event');
      }

      if (event.available_tickets > 0) {
        // Book ticket
        await trx('events')
          .where('id', eventId)
          .decrement('available_tickets', 1);

        await trx('bookings').insert({
          event_id: eventId,
          user_id: userId,
          status: 'confirmed'
        });

        await trx.commit();
        logger.info(`Ticket booked for user ${userId} in event ${eventId}`);
        res.status(201).json({ status: 'confirmed' });
      } else {
        // Add to waiting list
        const waitingCount = await trx('bookings')
          .where({ event_id: eventId, status: 'waiting' })
          .count('id as count')
          .first();

        await trx('bookings').insert({
          event_id: eventId,
          user_id: userId,
          status: 'waiting',
          waiting_position: waitingCount.count + 1
        });

        await trx.commit();
        logger.info(`User ${userId} added to waiting list for event ${eventId}`);
        res.status(201).json({ status: 'waiting', position: waitingCount.count + 1 });
      }
    } catch (error) {
      await trx.rollback();
      next(error);
    }
  }

  async cancel(req, res, next) {
    const { eventId, userId } = req.body;
    const trx = await db.transaction();

    try {
      const booking = await trx('bookings')
        .where({ event_id: eventId, user_id: userId })
        .whereNot('status', 'cancelled')
        .first();

      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      await trx('bookings')
        .where('id', booking.id)
        .update({ status: 'cancelled' });

      if (booking.status === 'confirmed') {
        // If cancelling a confirmed booking, check waiting list
        const nextInLine = await trx('bookings')
          .where({ event_id: eventId, status: 'waiting' })
          .orderBy('waiting_position', 'asc')
          .first();

        if (nextInLine) {
          // Confirm the next person in line
          await trx('bookings')
            .where('id', nextInLine.id)
            .update({ status: 'confirmed', waiting_position: null });

          // Update waiting positions for remaining users
          await trx('bookings')
            .where({ event_id: eventId, status: 'waiting' })
            .where('waiting_position', '>', nextInLine.waiting_position)
            .decrement('waiting_position', 1);
        } else {
          // No one in waiting list, increment available tickets
          await trx('events')
            .where('id', eventId)
            .increment('available_tickets', 1);
        }
      }

      await trx.commit();
      logger.info(`Booking cancelled for user ${userId} in event ${eventId}`);
      res.json({ status: 'cancelled' });
    } catch (error) {
      await trx.rollback();
      next(error);
    }
  }

  async getStatus(req, res, next) {
    try {
      const { eventId } = req.params;
      const event = await db('events')
        .where('id', eventId)
        .first();

      if (!event) {
        throw new NotFoundError('Event not found');
      }

      const waitingListCount = await db('bookings')
        .where({ event_id: eventId, status: 'waiting' })
        .count('id as count')
        .first();

      res.json({
        eventId,
        availableTickets: event.available_tickets,
        totalTickets: event.total_tickets,
        waitingListCount: waitingListCount.count
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EventController;
