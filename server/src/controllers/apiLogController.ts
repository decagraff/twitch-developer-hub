import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';

/**
 * Create a new API log entry
 */
export async function createApiLog(req: Request, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user!.userId;
    const { tokenId, method, endpoint, status, requestBody, responseBody, error } = req.body;

    const apiLog = await prisma.apiLog.create({
      data: {
        userId,
        tokenId: tokenId || null,
        method,
        endpoint,
        status: status || null,
        requestBody: requestBody ? JSON.stringify(requestBody) : null,
        responseBody: responseBody ? JSON.stringify(responseBody) : null,
        error: error || null,
      },
    });

    res.status(201).json({
      message: 'API log created successfully',
      log: {
        id: apiLog.id,
        method: apiLog.method,
        endpoint: apiLog.endpoint,
        status: apiLog.status,
        createdAt: apiLog.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Create API log error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create API log',
    });
  }
}

/**
 * Get all API logs for the authenticated user
 */
export async function getAllApiLogs(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { limit = '50', offset = '0' } = req.query;

    const logs = await prisma.apiLog.findMany({
      where: { userId },
      include: {
        token: {
          select: {
            id: true,
            name: true,
            tokenType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.apiLog.count({
      where: { userId },
    });

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      tokenId: log.tokenId,
      tokenName: log.token?.name || null,
      tokenType: log.token?.tokenType || null,
      method: log.method,
      endpoint: log.endpoint,
      status: log.status,
      requestBody: log.requestBody ? JSON.parse(log.requestBody) : null,
      responseBody: log.responseBody ? JSON.parse(log.responseBody) : null,
      error: log.error,
      createdAt: log.createdAt.toISOString(),
    }));

    res.json({
      logs: formattedLogs,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('Get API logs error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve API logs',
    });
  }
}

/**
 * Get a single API log by ID
 */
export async function getApiLog(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const log = await prisma.apiLog.findUnique({
      where: { id },
      include: {
        token: {
          select: {
            id: true,
            name: true,
            tokenType: true,
          },
        },
      },
    });

    if (!log) {
      res.status(404).json({
        error: 'Not found',
        message: 'API log not found',
      });
      return;
    }

    if (log.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this log',
      });
      return;
    }

    const formattedLog = {
      id: log.id,
      tokenId: log.tokenId,
      tokenName: log.token?.name || null,
      tokenType: log.token?.tokenType || null,
      method: log.method,
      endpoint: log.endpoint,
      status: log.status,
      requestBody: log.requestBody ? JSON.parse(log.requestBody) : null,
      responseBody: log.responseBody ? JSON.parse(log.responseBody) : null,
      error: log.error,
      createdAt: log.createdAt.toISOString(),
    };

    res.json({ log: formattedLog });
  } catch (error: any) {
    console.error('Get API log error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve API log',
    });
  }
}

/**
 * Delete an API log
 */
export async function deleteApiLog(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const log = await prisma.apiLog.findUnique({
      where: { id },
    });

    if (!log) {
      res.status(404).json({
        error: 'Not found',
        message: 'API log not found',
      });
      return;
    }

    if (log.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this log',
      });
      return;
    }

    await prisma.apiLog.delete({
      where: { id },
    });

    res.json({
      message: 'API log deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete API log error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete API log',
    });
  }
}

/**
 * Delete all API logs for the authenticated user
 */
export async function deleteAllApiLogs(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const result = await prisma.apiLog.deleteMany({
      where: { userId },
    });

    res.json({
      message: `Deleted ${result.count} API logs successfully`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('Delete all API logs error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete API logs',
    });
  }
}
