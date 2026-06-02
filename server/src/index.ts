import dotenv from 'dotenv'; dotenv.config();

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3001;

// Body Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const cleanFrontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : undefined;

const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
  cleanFrontendUrl
].filter(Boolean) as string[];

const isLocalOrigin = (originUrl: string): boolean => {
  try {
    const hostname = new URL(originUrl).hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.endsWith('.local')
    );
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || isLocalOrigin(origin)) {
      return callback(null, true);
    }
    console.log(`CORS blocked request from origin: ${origin}`);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate limiting setup to mitigate denial-of-service/flooding attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    sucesso: false,
    erro: 'Muitas requisições vindas deste IP. Por favor, tente novamente após 15 minutos.',
    tipoErro: 'erroLimiar'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all api routes
app.use('/api/', limiter);

// Initialize Supabase admin client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey || supabaseServiceKey === 'YOUR_SUPABASE_SERVICE_ROLE_KEY') {
  console.warn('\x1b[33m%s\x1b[0m', 'WARNING: SUPABASE_SERVICE_ROLE_KEY is not configured in .env! Authentication validation will fail.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  }
});

// Middleware to validate Supabase JWT session token
const validateSession = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      sucesso: false,
      erro: 'Acesso negado: Token de sessão não fornecido.',
      tipoErro: 'erroAutenticacao'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Acesso negado: Sessão inválida ou expirada.',
        tipoErro: 'erroAutenticacao'
      });
    }

    // Attach user information to request
    (req as any).user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({
      sucesso: false,
      erro: `Acesso negado: Erro ao validar a sessão. ${err.message || err}`,
      tipoErro: 'erroAutenticacao'
    });
  }
};

// Multer storage configuration for parsing multipart/form-data
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // Limit files to 10MB
  }
});

// Helper function to forward request to n8n and return response transparently
const forwardToN8N = async (url: string, body: any, res: express.Response) => {
  const secretKey = process.env.X_SORTEBIT_SECRET || '';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SorteBIT-Secret': secretKey
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { mensagem: responseText };
    }

    const isSuccess = response.ok && !responseData.status?.toLowerCase().includes('error') && !responseData.erro;

    // Transmit exact status code and standardized properties while preserving other fields (like ticket, tipoErro, etc.)
    return res.status(response.status).json({
      ...responseData,
      sucesso: isSuccess,
      status: isSuccess ? 'success' : (responseData.status || 'error'),
      mensagem: responseData.mensagem || responseData.message || responseData.erro || responseText || (isSuccess ? 'Operação realizada com sucesso.' : 'Falha no processamento.')
    });
  } catch (error: any) {
    console.error(`Error forwarding request to n8n (${url}):`, error);
    return res.status(502).json({
      sucesso: false,
      status: 'error',
      mensagem: 'Falha de comunicação com o servidor de automação.',
      erro: 'Falha de comunicação com o servidor de automação.',
      tipoErro: 'erroProxy'
    });
  }
};

// 1. Rota de Sorteio (Estudantes) - Autenticada
app.post('/api/sorteio', validateSession, async (req, res) => {
  const { nome, codigo, fotoBase64 } = req.body;

  if (!nome || !codigo || !fotoBase64) {
    return res.status(400).json({
      sucesso: false,
      erro: 'Parâmetros inválidos: nome, codigo e fotoBase64 são obrigatórios.',
      tipoErro: 'erroParametros'
    });
  }

  const n8nUrl = process.env.N8N_WEBHOOK_SORTEIO_URL || '';
  await forwardToN8N(n8nUrl, req.body, res);
});

// 2. Rota de Registro de Administradores - Pública (Bypasses session check, validated by invite code)
app.post('/api/admin/register', async (req, res) => {
  const acao = req.body.acao || req.body.Ação;
  const { nome, cpf, email, senha, codigo } = req.body;

  if (!acao || !nome || !cpf || !email || !senha || !codigo) {
    return res.status(400).json({
      sucesso: false,
      erro: 'Parâmetros inválidos para o registro administrativo.',
      tipoErro: 'erroParametros'
    });
  }

  const payloadNormalizado = {
    Ação: acao,
    nome,
    cpf,
    email,
    senha,
    codigo
  };

  const n8nUrl = process.env.N8N_WEBHOOK_ADMIN_REGISTER_URL || '';
  await forwardToN8N(n8nUrl, payloadNormalizado, res);
});

// 3. Rota de Registro de Estudantes - Pública (Bypasses session check)
app.post('/api/student/register', async (req, res) => {
  const acao = req.body.acao || req.body.Ação;
  const { nome, cpf, email, senha } = req.body;

  if (!acao || !nome || !cpf || !email || !senha) {
    return res.status(400).json({
      sucesso: false,
      erro: 'Parâmetros inválidos para o registro de estudante.',
      tipoErro: 'erroParametros'
    });
  }

  const payloadNormalizado = {
    Ação: acao,
    nome,
    cpf,
    email,
    senha
  };

  const n8nUrl = process.env.N8N_WEBHOOK_STUDENT_REGISTER_URL || '';
  await forwardToN8N(n8nUrl, payloadNormalizado, res);
});

// 4. Rota de Cadastro de Prêmios - Autenticada (Multipart FormData forwarding)
app.post('/api/produto', validateSession, upload.single('foto'), async (req, res) => {
  const n8nUrl = process.env.N8N_WEBHOOK_PRODUTO_URL || '';
  const secretKey = process.env.X_SORTEBIT_SECRET || '';

  try {
    const formData = new FormData();
    
    // Append text fields
    Object.keys(req.body).forEach(key => {
      formData.append(key, req.body[key]);
    });

    // Append file if present
    if (req.file) {
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
      formData.append('foto', blob, req.file.originalname);
    }

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'X-SorteBIT-Secret': secretKey
        // Content-Type is automatically set with the correct boundary when passing FormData
      },
      body: formData
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { mensagem: responseText };
    }

    return res.status(response.status).json(responseData);
  } catch (error: any) {
    console.error('Error forwarding product to n8n:', error);
    return res.status(502).json({
      sucesso: false,
      erro: 'Falha de comunicação ao cadastrar produto.',
      tipoErro: 'erroProxy'
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`SorteBIT backend proxy server running on port ${PORT}`);
});
