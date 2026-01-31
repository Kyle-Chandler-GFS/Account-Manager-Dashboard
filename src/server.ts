import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { signToken, verifyToken, getTokenFromHeader } from './auth';
import { authenticateUser, getCustomersForUser, getCustomerDetails } from './db';
import type { LoginRequest } from './types';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  credentials: true,
  origin: true, // Adjust for your internal domain
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Auth middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = getTokenFromHeader(req.headers.authorization) || req.cookies['auth-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  (req as any).user = payload;
  next();
};

// API Routes
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body as LoginRequest;
  
  const user = await authenticateUser(username, password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({ userId: user.id, username: user.username });
  
  res.cookie('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  });
});

app.get('/api/me', authenticate, async (req, res) => {
  const user = (req as any).user;
  return res.json({ userId: user.userId, username: user.username });
});

app.get('/api/customers', authenticate, async (req, res) => {
  const user = (req as any).user;
  const customers = await getCustomersForUser(user.userId);
  return res.json({ customers });
});

app.get('/api/customers/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  const customerId = parseInt(req.params.id);
  const customer = await getCustomerDetails(customerId, user.userId);
  
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  return res.json({ customer });
});

app.post('/api/logout', (req, res) => {
  res.cookie('auth-token', '', {
    httpOnly: true,
    maxAge: 0,
  });
  return res.json({ success: true });
});

// Serve frontend
if (process.env.NODE_ENV === 'production') {
  // Production: serve built files
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
} else {
  // Development: serve static files from public
  // Note: For TSX files to work, you need to run Vite dev server separately
  // Or build the frontend first with: npm run build
  app.use(express.static(path.join(__dirname, '../public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
