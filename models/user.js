"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { UnauthorizedError, NotFoundError, BadRequestError } = require("../expressError");
const { BCRYPT_WORK_FACTOR } = require("../config");

/** User of the site. */

class User {

  /** Register new user. Returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {

    const hashed_password = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
      `INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
        VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
       RETURNING username, password, first_name, last_name, phone`,
      [username, hashed_password, first_name, last_name, phone]);

    return result.rows[0];
  }

  /** Authenticate: is username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT password
        FROM users
        WHERE username = $1`,
      [username]);
    const user = result.rows[0];

    if (user) {
      return ((await bcrypt.compare(password, user.password)) === true);
    }
    throw new BadRequestError("Invalid user/password");
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(
      `UPDATE users
        SET last_login_at = current_timestamp
        WHERE username = $1
        RETURNING last_login_at`,
      [username]);
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No such user: ${username}`);

    return user;
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name}, ...] */

  static async all() {
    const result = await db.query(
      `SELECT username, first_name, last_name
        FROM users`
    );

    return result.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `SELECT username, first_name, last_name, 
              phone, join_at, last_login_at
        FROM users
        WHERE username = $1`,
      [username]
    );
    let user = result.rows[0];

    if (!user) throw new NotFoundError(`No such user: ${username}`);

    return user;
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {

    const mResults = await db.query(
      `SELECT m.id, m.to_username, m.body, m.sent_at, m.read_at,
            u.first_name, u.last_name, u.phone
      FROM messages as m 
      JOIN users as u ON m.to_username = u.username
      WHERE m.from_username = $1`,
      [username]
    );

    return mResults.rows.map(r => ({
      id: r.id,
      to_user: {
        username: r.to_username,
        first_name: r.first_name,
        last_name: r.last_name,
        phone: r.phone
      },
      body: r.body,
      sent_at: r.sent_at,
      read_at: r.read_at
    }))
  }


  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) {

    const mResults = await db.query(
      `SELECT m.id, m.from_username, m.body, m.sent_at, m.read_at,
            u.first_name, u.last_name, u.phone
      FROM messages as m 
      JOIN users as u ON m.from_username = u.username
      WHERE m.to_username = $1`,
      [username]
    );
  
    return mResults.rows.map(r => ({
      id: r.id,
      from_user: {
        username: r.from_username,
        first_name: r.first_name,
        last_name: r.last_name,
        phone: r.phone
      },
      body: r.body,
      sent_at: r.sent_at,
      read_at: r.read_at
    }))
  }
}


module.exports = User;
