const joi = require("joi");

const createEventValidation = (req, res, next) => {
  try {
    const schema = joi.object({
      title: joi.string().min(3).max(200).required(),
      description: joi.string().min(10).required(),
      date: joi.date().required(),
      time: joi.string().required(),
      location: joi.string().required(),
      image: joi.string().allow("").optional(),
      email: joi.string().email().required(),
      phone: joi.string().allow("").optional(),
      gender: joi.string().valid("male", "female", "all").optional(),
      ticketPrice: joi.number().min(0).required(),
      totalTickets: joi.number().integer().min(0).optional(),
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

const updateEventValidation = (req, res, next) => {
  try {
    const schema = joi.object({
      title: joi.string().min(3).max(200),
      description: joi.string().min(10),
      date: joi.date(),
      time: joi.string(),
      location: joi.string(),
      image: joi.string().allow(""),
      email: joi.string().email(),
      phone: joi.string(),
      gender: joi.string().valid("male", "female", "all"),
      ticketPrice: joi.number().min(0),
      totalTickets: joi.number().integer().min(1),
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

module.exports = { createEventValidation, updateEventValidation };

