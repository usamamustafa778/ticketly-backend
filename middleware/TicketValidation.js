const joi = require("joi");

const createTicketValidation = (req, res, next) => {
  try {
    const schema = joi.object({
      eventId: joi.string().required(),
      username: joi.string().min(2).required(),
      email: joi.string().email().required(),
      phone: joi.string().min(10).required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: error.details[0].message,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

const submitPaymentValidation = (req, res, next) => {
  try {
    // Amount is derived from ticket.event.ticketPrice on backend (source of truth)
    // Convert ticketId to string if it comes as number or other type
    if (req.body && req.body.ticketId && typeof req.body.ticketId !== 'string') {
      req.body.ticketId = String(req.body.ticketId);
    }
    
    const schema = joi.object({
      ticketId: joi.string().required().trim().messages({
        'string.empty': 'ticketId is required',
        'any.required': 'ticketId is required',
      }),
      method: joi.string().allow('').optional().default('manual'),
      // amount removed - derived from ticket.event.ticketPrice on backend
      // Allow unknown fields (like amount if sent by mistake, but we ignore it)
    }).unknown(true);

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: false,
      convert: true, // Allow type conversion
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: error.details.map(d => d.message).join(', '),
      });
    }
    
    // Ensure validated values are set in req.body for controller
    if (value) {
      req.body.ticketId = value.ticketId;
      req.body.method = value.method || 'manual';
    }
    
    // Final check - ensure ticketId is present
    if (!req.body.ticketId || req.body.ticketId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: "ticketId is required and cannot be empty",
      });
    }
    
    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

const verifyPaymentValidation = (req, res, next) => {
  try {
    const schema = joi.object({
      action: joi.string().valid("approve", "reject").required(),
      adminNote: joi.string().allow("").optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: error.details[0].message,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

const scanTicketValidation = (req, res, next) => {
  try {
    const schema = joi.object({
      accessKey: joi.string().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: error.details[0].message,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

const updateTicketStatusByKeyValidation = (req, res, next) => {
  try {
    const schema = joi.object({
      accessKey: joi.string().required().trim().messages({
        'string.empty': 'accessKey (ticket #) is required',
        'any.required': 'accessKey (ticket #) is required',
      }),
      status: joi.string().valid("used", "cancelled").required().messages({
        'any.only': 'status must be either "used" or "cancelled"',
        'any.required': 'status is required',
      }),
    });

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: error.details.map(d => d.message).join(', '),
      });
    }

    // Ensure validated values are set in req.body
    if (value) {
      req.body.accessKey = value.accessKey;
      req.body.status = value.status;
    }

    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

module.exports = {
  createTicketValidation,
  submitPaymentValidation,
  verifyPaymentValidation,
  scanTicketValidation,
  updateTicketStatusByKeyValidation,
};
