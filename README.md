# Event Ticket Booking System

A Node.js application for managing event ticket bookings with concurrent request handling and waiting list functionality.

## Features

- Event initialization with configurable ticket capacity
- Concurrent ticket booking with race condition handling
- Waiting list management
- Ticket cancellation with automatic reassignment
- Comprehensive error handling
- Rate limiting
- Request validation
- Logging system

## Tech Stack

- Node.js
- Express.js
- SQLite3 (via Knex.js)
- Jest (Testing)
- Winston (Logging)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npm run migrate
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Documentation

### Initialize Event
- **POST** `/api/initialize`
- Creates a new event with specified ticket capacity
- Request Body:
  ```json
  {
    "totalTickets": 5
  }
  ```
- Response (201):
  ```json
  {
    "event": {
      "id": 1,
      "total_tickets": 5,
      "available_tickets": 5,
      "created_at": "2024-02-04T10:00:00.000Z",
      "updated_at": "2024-02-04T10:00:00.000Z"
    }
  }
  ```

### Book Ticket
- **POST** `/api/book`
- Books a ticket for a user. If no tickets are available, adds user to waiting list
- Request Body:
  ```json
  {
    "eventId": 1,
    "userId": "user123"
  }
  ```
- Response (200) - Successful Booking:
  ```json
  {
    "booking": {
      "id": 1,
      "event_id": 1,
      "user_id": "user123",
      "status": "confirmed",
      "waiting_position": null,
      "created_at": "2024-02-04T10:00:00.000Z",
      "updated_at": "2024-02-04T10:00:00.000Z"
    }
  }
  ```
- Response (200) - Added to Waiting List:
  ```json
  {
    "booking": {
      "id": 6,
      "event_id": 1,
      "user_id": "user123",
      "status": "waiting",
      "waiting_position": 1,
      "created_at": "2024-02-04T10:00:00.000Z",
      "updated_at": "2024-02-04T10:00:00.000Z"
    }
  }
  ```

### Cancel Booking
- **POST** `/api/cancel`
- Cancels a booking and automatically assigns ticket to first person in waiting list
- Request Body:
  ```json
  {
    "eventId": 1,
    "userId": "user123"
  }
  ```
- Response (200):
  ```json
  {
    "success": true,
    "message": "Booking cancelled successfully"
  }
  ```

### Check Booking Status
- **GET** `/api/booking-status/:eventId/:userId`
- Retrieves the current status of a user's booking
- Response (200):
  ```json
  {
    "booking": {
      "id": 1,
      "event_id": 1,
      "user_id": "user123",
      "status": "confirmed",
      "waiting_position": null,
      "created_at": "2024-02-04T10:00:00.000Z",
      "updated_at": "2024-02-04T10:00:00.000Z"
    }
  }
  ```

### Get Event Status
- **GET** `/api/status/:eventId`
- Returns current event status including available tickets and waiting list count

## Error Responses

All endpoints may return the following error responses:

- 400 Bad Request: Invalid input data
- 404 Not Found: Resource not found
- 429 Too Many Requests: Rate limit exceeded
- 500 Internal Server Error: Server error

## Rate Limiting

The API implements rate limiting to prevent abuse:
- 100 requests per 15 minutes per IP address
- Exceeded limits will return a 429 status code

## Testing

Run the test suite:
```bash
npm test
```

The test suite covers:
- Event initialization
- Ticket booking
- Waiting list functionality
- Ticket cancellation
- Concurrent booking scenarios
- Error cases

For development with automatic test reloading:
```bash
npm run test:watch
```

## Design Choices

1. **Concurrency Handling**
   - Used database transactions to ensure data consistency
   - Implemented optimistic locking for ticket bookings

2. **Data Storage**
   - SQLite for simplicity and ease of setup
   - Knex.js for query building and migrations
   - Separate tables for events and bookings

3. **Error Handling**
   - Custom error classes for different scenarios
   - Comprehensive validation middleware
   - Detailed error logging

4. **Security**
   - Rate limiting to prevent abuse
   - Input validation for all endpoints
   - Prepared statements for database queries

## Project Structure

```
src/
├── controllers/     # Request handlers
├── database/       # Database setup and migrations
├── middleware/     # Express middleware
├── utils/          # Utility functions and helpers
├── routes.js      # API routes
└── server.js      # Application entry point
```
