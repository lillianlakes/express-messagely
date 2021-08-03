"use strict";

const Router = require("express").Router;
const router = new Router();
const bcrypt = require("bcrypt");
const { SECRET_KEY, BCRYPT_WORK_FACTOR } = require("../config")
const { BadRequestError } = require("../expressError")
const jwt = require("jsonwebtoken");
const db = require("../db");
const User = require("../models/user");


/** POST /login: {username, password} => {token} */
router.post("/login", async function (req, res, next) {
  const { username, password } = req.body;

  const userLoggedIn = await User.authenticate(username, password);

  if (userLoggedIn) {
    let token = jwt.sign({ username }, SECRET_KEY);
    await User.updateLoginTimestamp(username);
    return res.json({ token });
  }
  throw new BadRequestError("Invalid user/password");
});


/** POST /register: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 */
router.post("/register", async function (req, res, next) {
  const { username, password, first_name, last_name, phone } = req.body;
  
  try {
    await User.register({ username, password, first_name, last_name, phone });
    const token = jwt.sign({ username }, SECRET_KEY);
    return res.json({ token });
  } catch (e){
    throw new BadRequestError("username already exists");
  }
});

module.exports = router;