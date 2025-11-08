import { body, param } from 'express-validator';

/**
 * Validation for generating an app access token
 */
export const validateGenerateAppToken = [
  body('twitchConfigId')
    .trim()
    .notEmpty()
    .withMessage('Twitch Config ID is required')
    .isUUID()
    .withMessage('Invalid Twitch Config ID format'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
];

/**
 * Validation for starting user access token device flow
 */
export const validateStartUserToken = [
  body('twitchConfigId')
    .trim()
    .notEmpty()
    .withMessage('Twitch Config ID is required')
    .isUUID()
    .withMessage('Invalid Twitch Config ID format'),

  body('scopes')
    .isArray({ min: 1 })
    .withMessage('At least one scope is required'),

  body('scopes.*')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each scope must be a non-empty string'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
];

/**
 * Validation for polling device flow token
 */
export const validatePollUserToken = [
  body('twitchConfigId')
    .trim()
    .notEmpty()
    .withMessage('Twitch Config ID is required')
    .isUUID()
    .withMessage('Invalid Twitch Config ID format'),

  body('deviceCode')
    .trim()
    .notEmpty()
    .withMessage('Device code is required'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
];

/**
 * Validation for deleting a token
 */
export const validateDeleteToken = [
  param('id')
    .isUUID()
    .withMessage('Invalid token ID'),
];

/**
 * Validation for getting a single token
 */
export const validateGetToken = [
  param('id')
    .isUUID()
    .withMessage('Invalid token ID'),
];

/**
 * Validation for starting authorization code flow
 */
export const validateStartAuthorizationFlow = [
  body('twitchConfigId')
    .trim()
    .notEmpty()
    .withMessage('Twitch Config ID is required')
    .isUUID()
    .withMessage('Invalid Twitch Config ID format'),

  body('scopes')
    .isArray({ min: 1 })
    .withMessage('At least one scope is required'),

  body('scopes.*')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each scope must be a non-empty string'),

  body('state')
    .trim()
    .notEmpty()
    .withMessage('State parameter is required')
    .isLength({ min: 32, max: 128 })
    .withMessage('State must be between 32 and 128 characters'),
];

/**
 * Validation for handling authorization callback
 */
export const validateAuthorizationCallback = [
  body('twitchConfigId')
    .trim()
    .notEmpty()
    .withMessage('Twitch Config ID is required')
    .isUUID()
    .withMessage('Invalid Twitch Config ID format'),

  body('code')
    .trim()
    .notEmpty()
    .withMessage('Authorization code is required'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
];

/**
 * Validation for refreshing a token
 */
export const validateRefreshToken = [
  param('id')
    .isUUID()
    .withMessage('Invalid token ID'),
];
