"use strict";

/** Middleware for handling req authorization for routes. */

const jwt = require("jsonwebtoken");

const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");
const Message = require("../models/message");


/** Middleware: Authenticate user. */

function authenticateJWT(req, res, next) {
  try {
    const tokenFromBody = req.body._token;
    const payload = jwt.verify(tokenFromBody, SECRET_KEY);
    res.locals.user = payload;
    return next();
  } catch (err) {
    // error in this middleware isn't error -- continue on
    return next();
  }
}

/** Middleware: Requires user is authenticated. */

function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) {
      console.log("You made it here")
      throw new UnauthorizedError();
    } else {
      return next();
    }
  } catch (err) {
    return next(err);
  }
}

/** Middleware: Requires user is user for route. */

function ensureCorrectUser(req, res, next) {
  try {
    if (!res.locals.user ||
        res.locals.user.username !== req.params.username) {
      throw new UnauthorizedError();
    } else {
      return next();
    }
  } catch (err) {
    return next(err);
  }
}

/** Middleware: Requires message recipient to be current user */

async function ensureMessageRecipient(req, res, next) {
  const message = await Message.get(req.params.id);
  const toUsername = message.to_user.username;
  try {
    if (!res.locals.user ||
        res.locals.user.username !== toUsername) {
      throw new UnauthorizedError();
    } else {
      return next();
    }
  } catch (err) {
    return next(err);
  }
}

/** Middleware: Requires message sender or recipient to be current user */

async function ensureSenderRecipient(req, res, next) {
  const message = await Message.get(req.params.id);
  const toUsername = message.to_user.username;
  const fromUsername = message.from_user.username;
  try {
    if (!res.locals.user ||
        (res.locals.user.username !== toUsername ||
         res.locals.user.username !== fromUsername)){
      throw new UnauthorizedError();
    } else {
        // TODO: use res.locals.message .....
      return next();
    }
  } catch (err) {
    return next(err);
  }
}



module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureCorrectUser,
  ensureMessageRecipient,
  ensureSenderRecipient,
};
