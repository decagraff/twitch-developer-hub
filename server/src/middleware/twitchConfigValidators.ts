import { body, param } from 'express-validator';

/**
 * Validation for creating a new Twitch config
 */
export const validateCreateConfig = [
  body('clientId')
    .trim()
    .notEmpty()
    .withMessage('Client ID is required')
    .isLength({ min: 30, max: 31 })
    .withMessage('Client ID must be 30-31 characters long')
    .matches(/^[a-z0-9]+$/)
    .withMessage('Client ID must contain only lowercase letters and numbers'),

  body('clientSecret')
    .trim()
    .notEmpty()
    .withMessage('Client Secret is required')
    .isLength({ min: 30, max: 30 })
    .withMessage('Client Secret must be 30 characters long')
    .matches(/^[a-z0-9]+$/)
    .withMessage('Client Secret must contain only lowercase letters and numbers'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
];

/**
 * Validation for updating a Twitch config
 */
export const validateUpdateConfig = [
  param('id')
    .isUUID()
    .withMessage('Invalid config ID'),

  body('clientId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Client ID cannot be empty')
    .isLength({ min: 30, max: 31 })
    .withMessage('Client ID must be 30-31 characters long')
    .matches(/^[a-z0-9]+$/)
    .withMessage('Client ID must contain only lowercase letters and numbers'),

  body('clientSecret')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Client Secret cannot be empty')
    .isLength({ min: 30, max: 30 })
    .withMessage('Client Secret must be 30 characters long')
    .matches(/^[a-z0-9]+$/)
    .withMessage('Client Secret must contain only lowercase letters and numbers'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
];

/**
 * Validation for deleting a Twitch config
 */
export const validateDeleteConfig = [
  param('id')
    .isUUID()
    .withMessage('Invalid config ID'),
];

/**
 * Validation for getting a single Twitch config
 */
export const validateGetConfig = [
  param('id')
    .isUUID()
    .withMessage('Invalid config ID'),
];
