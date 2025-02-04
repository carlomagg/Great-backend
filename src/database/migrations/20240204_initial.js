exports.up = function(knex) {
  return knex.schema
    .createTable('events', function(table) {
      table.increments('id').primary();
      table.integer('total_tickets').notNullable();
      table.integer('available_tickets').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('bookings', function(table) {
      table.increments('id').primary();
      table.integer('event_id').references('id').inTable('events');
      table.string('user_id').notNullable();
      table.enum('status', ['confirmed', 'waiting', 'cancelled']).notNullable();
      table.integer('waiting_position').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('bookings')
    .dropTable('events');
};
