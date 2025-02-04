const request = require('supertest');
const app = require('../server');
const db = require('../database/db');

beforeEach(async () => {
  await db.migrate.rollback();
  await db.migrate.latest();
});

afterAll(async () => {
  await db.destroy();
});

describe('Event Ticket Booking API', () => {
  describe('POST /api/initialize', () => {
    it('should initialize an event with given capacity', async () => {
      const response = await request(app)
        .post('/api/initialize')
        .send({ totalTickets: 5 });
      
      expect(response.status).toBe(201);
      expect(response.body.event).toHaveProperty('id');
      expect(response.body.event.total_tickets).toBe(5);
      expect(response.body.event.available_tickets).toBe(5);
    });

    it('should reject invalid ticket count', async () => {
      const response = await request(app)
        .post('/api/initialize')
        .send({ totalTickets: -1 });
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/book', () => {
    let eventId;

    beforeEach(async () => {
      const initResponse = await request(app)
        .post('/api/initialize')
        .send({ totalTickets: 2 });
      eventId = initResponse.body.event.id;
    });

    it('should book a ticket successfully', async () => {
      const response = await request(app)
        .post('/api/book')
        .send({ eventId, userId: 'user1' });
      
      expect(response.status).toBe(200);
      expect(response.body.booking.status).toBe('confirmed');
    });

    it('should add to waiting list when event is full', async () => {
      // Book all tickets
      await request(app).post('/api/book').send({ eventId, userId: 'user1' });
      await request(app).post('/api/book').send({ eventId, userId: 'user2' });
      
      // Try booking when full
      const response = await request(app)
        .post('/api/book')
        .send({ eventId, userId: 'user3' });
      
      expect(response.status).toBe(200);
      expect(response.body.booking.status).toBe('waiting');
      expect(response.body.booking.waiting_position).toBe(1);
    });
  });

  describe('POST /api/cancel', () => {
    let eventId;

    beforeEach(async () => {
      const initResponse = await request(app)
        .post('/api/initialize')
        .send({ totalTickets: 1 });
      eventId = initResponse.body.event.id;
      await request(app).post('/api/book').send({ eventId, userId: 'user1' });
    });

    it('should cancel booking successfully', async () => {
      const response = await request(app)
        .post('/api/cancel')
        .send({ eventId, userId: 'user1' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should assign ticket to waiting list user after cancellation', async () => {
      // Add user to waiting list
      await request(app).post('/api/book').send({ eventId, userId: 'user2' });
      
      // Cancel first booking
      await request(app).post('/api/cancel').send({ eventId, userId: 'user1' });
      
      // Check if waiting user got the ticket
      const response = await request(app)
        .get(`/api/booking-status/${eventId}/user2`);
      
      expect(response.status).toBe(200);
      expect(response.body.booking.status).toBe('confirmed');
    });
  });
});
