"use strict";

const Router = require("express").Router;
const router = new Router();
const bcrypt = require("bcrypt");
const { SECRET_KEY } = require("../config")
const { BadRequestError } = require("../expressError")


/** POST /login: {username, password} => {token} */

router.post("/login", async function (req, res, next) {
  const { username, password } = req.body;
  const result = await db.query(
    "SELECT password FROM users WHERE username = $1",
    [username]);
  let user = result.rows[0];

  if (user) {
    if (await bcrypt.compare(password, user.password) === true) {
      let token = jwt.sign({ username }, SECRET_KEY);
      return res.json({ token });
    }
  }
  throw new UnauthorizedError("Invalid user/password");
});


/** POST /register: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 */

router.post("/register", async function (req, res, next) {
  const { username, password, first_name, last_name, phone } = req.body;
  const hashedPassword = await bcrypt.hash(
    password, BCRYPT_WORK_FACTOR);

  try {
    await db.query(
      `INSERT INTO users (username, password, 
                        first_name, last_name, phone, 
                        join_at, last_login_at)
         VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
         RETURNING username`,
      [username, hashedPassword, first_name, last_name, phone]);

    const token = jwt.sign({ username }, SECRET_KEY);

    return res.json({ token });
  } catch {
    throw new BadRequestError("username already exists");
  }

});

module.exports = router;