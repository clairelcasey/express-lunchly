"use strict";

/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }


  get notes() {
    console.log('get notes called', 'this._notes', this._notes)
    return this._notes;
  }

  set notes(val) {
    this._notes = val || 'THIS PERSON HAS NO NOTES';
    console.log('set notes called', 'this._notes', this._notes)
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           ORDER BY last_name, first_name`,
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           WHERE id = $1`,
      [id],
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes],
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers
             SET first_name=$1,
                 last_name=$2,
                 phone=$3,
                 notes=$4
             WHERE id = $5`, [
        this.firstName,
        this.lastName,
        this.phone,
        this.notes,
        this.id,
      ],
      );
    }
  }


  /** get Customer's full name. Returns 'FirstName LastName' */
  
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /** Search customer first and last names based on search input 
   * Returns [{customer}, {customer}, ... ]
  */

  static async search(searchName) {

    const searchResults = await db.query(
      `SELECT id,
              first_name AS "firstName", 
              last_name  AS "lastName",
              phone,
              notes 
        FROM customers 
        WHERE CONCAT(first_name, ' ', last_name) ILIKE $1`, [`%${searchName}%`]
    );

    return searchResults.rows.map(c => new Customer(c));

  }

  /* get Top X Customers by number of reservations. 
  Returns [{customer}, {customer}, ... ]
  */

  static async getBestCustomers(listSize=10) {
    const results = await db.query(
      `SELECT c.id,
              c.first_name AS "firstName", 
              c.last_name  AS "lastName",
              c.phone,
              c.notes, 
              COUNT(c.id) AS "reservationCount"
        FROM reservations as r
          JOIN customers as c
          ON r.customer_id = c.id
        GROUP BY c.id, c.first_name, c.last_name, c.phone, c.notes
        ORDER BY COUNT(c.id) DESC
        LIMIT $1;`, [listSize]
    );

    return results.rows.map(c => new Customer(c));
  }
}

module.exports = Customer;
