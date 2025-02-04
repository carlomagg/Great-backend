const db = require('../database/db');
const logger = require('../utils/logger');
const { NotFoundError, ConflictError } = require('../utils/errors');

class EventController {
  async initialize(req, res, next) {
    try {
      const { totalTickets } = req.body;
      
      const [id] = await db('events').insert({
        total_tickets: totalTickets,
        available_tickets: totalTickets
      });

      const event = await db('events').where('id', id).first();
      
      logger.info(`Event initialized with ID: ${id}`);
      res.status(201).json({ event });
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

      let booking;
      if (event.available_tickets > 0) {
        // Book ticket
        await trx('events')
          .where('id', eventId)
          .decrement('available_tickets', 1);

        const [bookingId] = await trx('bookings').insert({
          event_id: eventId,
          user_id: userId,
          status: 'confirmed'
        });

        booking = await trx('bookings').where('id', bookingId).first();

        await trx.commit();
        logger.info(`Ticket booked for user ${userId} in event ${eventId}`);
      } else {
        // Add to waiting list
        const waitingCount = await trx('bookings')
          .where({ event_id: eventId, status: 'waiting' })
          .count('id as count')
          .first();

        const [bookingId] = await trx('bookings').insert({
          event_id: eventId,
          user_id: userId,
          status: 'waiting',
          waiting_position: waitingCount.count + 1
        });

        booking = await trx('bookings').where('id', bookingId).first();

        await trx.commit();
        logger.info(`User ${userId} added to waiting list for event ${eventId}`);
      }
      res.status(200).json({ booking });
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
      res.json({ 
        success: true,
        message: "Booking cancelled successfully"
      });
    } catch (error) {
      await trx.rollback();
      next(error);
    }
  }

  async getStatus(req, res, next) {
    try {
      const { eventId } = req.params;
      const event = await db('events').where('id', eventId).first();
      
      if (!event) {
        throw new NotFoundError('Event not found');
      }

      const waitingListCount = await db('bookings')
        .where({ event_id: eventId, status: 'waiting' })
        .count('id as count')
        .first();

      res.json({
        event: {
          ...event,
          waiting_list_count: waitingListCount.count
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookingStatus(req, res, next) {
    try {
      const { eventId, userId } = req.params;
      
      const booking = await db('bookings')
        .where({
          event_id: eventId,
          user_id: userId
        })
        .orderBy('created_at', 'desc')
        .first();

      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      res.json({ booking });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EventController;
