const joi = require("joi");

const signupValidation = (req, res, next) => {
  try {
    const schema = joi.object({
      name: joi.string().min(3).max(30).required(),
      email: joi.string().email().required(),
      password: joi.string().min(8).max(30).required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: "Validation Error",
        error: error.details[0].message,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const loginValidation = (req, res, next) => {
  try {
    const schema = joi.object({
      email: joi.string().email().required(),
      password: joi.string().min(8).max(30).required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: "Validation Error",
        error: error.details[0].message,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const updateUserValidation = (req, res, next) => {
  try {
    const schema = joi.object({
      name: joi.string().min(3).max(30),
      email: joi.string().email(),
      password: joi.string().min(8).max(30),
      likedEventsVisibility: joi.string().valid("public", "private"),
    }).min(1); // At least one field must be present

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: "Validation Error",
        error: error.details[0].message,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const verifyOtpValidation = (req, res, next) => {
  try {
    const schema = joi.object({
      otp: joi.string().length(6).pattern(/^[0-9]+$/).required().messages({
        "string.length": "OTP must be 6 digits",
        "string.pattern.base": "OTP must contain only numbers",
      }),
      tempToken: joi.string().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: "Validation Error",
        error: error.details[0].message,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const refreshTokenValidation = (req, res, next) => {
  try {
    const schema = joi.object({
      refreshToken: joi.string().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: "Validation Error",
        error: error.details[0].message,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const updateUserByAdminValidation = (req, res, next) => {
  try {
    const schema = joi.object({
      name: joi.string().min(3).max(30),
      email: joi.string().email(),
      password: joi.string().min(8).max(30),
      role: joi.string().valid("user", "admin", "organizer"),
      isVerified: joi.boolean(),
    }).min(1); // At least one field must be present

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: "Validation Error",
        error: error.details[0].message,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

module.exports = { 
  signupValidation, 
  loginValidation, 
  updateUserValidation, 
  verifyOtpValidation, 
  refreshTokenValidation,
  updateUserByAdminValidation 
};
