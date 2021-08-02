"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { UnauthorizedError, NotFoundError } = require("../expressError");
const { BCRYPT_WORK_FACTOR } = require("../config");

/** User of the site. */

class User {

  /** Register new user. Returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {

    const hashed_password = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
      `INSERT INTO users (username, password, first_name, last_name, phone, join_at)
        VALUES ($1, $2, $3, $4, $5, current_timestamp)
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
    throw new UnauthorizedError("Invalid user/password");
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

    console.log(user);

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

//         RETURNING username, first_name, last_name

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

  // RETURNING username, first_name, last_name, 
  // phone, join_at, last_login_at

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const mResults = await db.query(
      `SELECT id, from_username, to_username, body, sent_at, read_at
        FROM messages
        WHERE from_username = $1`,
      [username]
    );
    const messages = mResults.rows;
    // const messages = { ...mResults.rows, from_username: undefined };

    // need to check if err handling works
    // if this doesn't work, then get 'user' using a JOIN
    if (!messages.from_username) throw new NotFoundError(`No such user: ${username}`);

    for (let message in messages){
      const uResults = db.query(
        `SELECT username, first_name, last_name, phone
          FROM users
          WHERE username = $1`,
          [message.to_username]
        );
      const user = uResults.rows[0];
      message.to_user = user; 
    }
    
    return messages;
  }

  // RETURNING id, from_username, to_username, body, sent_at, read_at
  // RETURNING username, first_name, last_name, phone

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const mResults = await db.query(
      `SELECT id, from_username, body, sent_at, read_at
        FROM messages
        WHERE to_username = $1`,
      [username]
    );
    const messages = mResults.rows;

    // need to check if err handling works
    // if this doesn't work, then get 'user' using a JOIN
    if (!messages.to_username) throw new NotFoundError(`No such user: ${username}`);

    for (let message in messages){
      const uResults = db.query(
        `SELECT username, first_name, last_name, phone
          FROM users
          WHERE username = $1`,
          [message.from_username]
        );
      const user = uResults.rows[0];
      message.from_user = user; 
    }
    
    return messages;
  }
}

// RETURNING id, from_username, body, sent_at, read_at
// RETURNING username, first_name, last_name, phone


module.exports = User;
