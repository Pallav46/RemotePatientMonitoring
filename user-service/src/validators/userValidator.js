const Joi = require('joi');

const validateUser = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).required()
  });

  return schema.validate(data);
};

const validateImageUpload = (data) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    deviceType: Joi.string().optional()
  });

  return schema.validate(data);
};

const validatePatientData = (data) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    deviceType: Joi.string().optional(),
    vitals: Joi.object({
      heartRate: Joi.number().min(0).max(300).optional().allow(null),
      bloodPressure: Joi.object({
        systolic: Joi.number().min(0).max(300).required(),
        diastolic: Joi.number().min(0).max(200).required()
      }).optional().allow(null),
      oxygenSaturation: Joi.number().min(0).max(100).optional().allow(null),
      temperature: Joi.number().min(20).max(50).optional().allow(null),
      respiratoryRate: Joi.number().min(0).max(100).optional().allow(null)
    }).required()
  });

  return schema.validate(data);
};

module.exports = { validateUser, validateImageUpload, validatePatientData };
