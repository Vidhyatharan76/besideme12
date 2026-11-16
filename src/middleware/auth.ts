import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase-server.ts';

export interface SupabaseUser {
  uid: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export interface AuthRequest extends Request {
  user?: SupabaseUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    const sbUser = data.user;
    req.user = {
      uid: sbUser.id,
      email: sbUser.email,
      name: (sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email) as string,
    };
    next();
  } catch (error) {
    console.error('Error verifying Supabase access token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
