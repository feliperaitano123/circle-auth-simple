# 🚀 Sistema de Autenticação Circle - Versão Simplificada

## 📋 Visão Geral

Sistema elegante de autenticação via email que:
- Valida membros da comunidade Circle
- Envia código por email
- Gera tokens JWT seguros
- Interface web limpa e intuitiva
- Zero complexidade desnecessária

## 🏗️ Arquitetura

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Cliente   │────▶│   Auth Server   │────▶│  Circle API  │
│    (MCP)    │     │   (Vercel)      │     │              │
└─────────────┘     └─────────────────┘     └──────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │  Email Service  │
                    │ (Resend/SMTP)   │
                    └─────────────────┘
```

## 🎯 Passo 1: Configuração Inicial

### 1.1 Criar Projeto
```bash
mkdir circle-auth-simple
cd circle-auth-simple
npm init -y
```

### 1.2 Instalar Dependências
```bash
# Core
npm install express cors dotenv
npm install jsonwebtoken bcryptjs
npm install axios

# Email
npm install resend

# Database (Redis)
npm install @vercel/kv

# Dev
npm install -D typescript @types/node nodemon
npm install -D @types/express @types/cors @types/jsonwebtoken
```

### 1.3 Estrutura do Projeto
```
circle-auth-simple/
├── api/
│   ├── index.ts         # Servidor principal
│   ├── validate.ts      # Validar email
│   ├── verify.ts        # Verificar código
│   └── health.ts        # Health check
├── lib/
│   ├── circle.ts        # Integração Circle
│   ├── email.ts         # Envio de emails
│   ├── tokens.ts        # Gerenciamento JWT
│   ├── codes.ts         # Códigos temporários
│   └── config.ts        # Configurações
├── public/
│   ├── index.html       # Página principal
│   ├── style.css        # Estilos
│   └── script.js        # JavaScript frontend
├── .env.local           # Variáveis de ambiente
├── package.json
├── tsconfig.json
└── vercel.json
```

## 📝 Passo 2: Configurações Base

### 2.1 `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowJs": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.2 `vercel.json`
```json
{
  "functions": {
    "api/*.ts": {
      "maxDuration": 10
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/public/$1" }
  ]
}
```

### 2.3 `.env.local`
```env
# Circle API
CIRCLE_API_TOKEN=seu_token_headless_auth_aqui
CIRCLE_COMMUNITY_URL=https://sua-comunidade.circle.so

# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# JWT & Security
JWT_SECRET=gere_uma_string_aleatoria_de_64_caracteres_aqui
JWT_EXPIRES_IN=7d

# App Config
APP_NAME=MCP Circle Auth
FROM_EMAIL=noreply@seudominio.com
FROM_NAME=Sua Comunidade

# URLs
APP_URL=https://auth.seudominio.com
```

## 💻 Passo 3: Backend Implementation

### 3.1 `lib/config.ts`
```typescript
export const config = {
  circle: {
    apiToken: process.env.CIRCLE_API_TOKEN!,
    communityUrl: process.env.CIRCLE_COMMUNITY_URL!,
    apiUrl: 'https://app.circle.so'
  },
  email: {
    apiKey: process.env.RESEND_API_KEY!,
    fromEmail: process.env.FROM_EMAIL || 'noreply@example.com',
    fromName: process.env.FROM_NAME || 'Circle Auth'
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  app: {
    name: process.env.APP_NAME || 'MCP Auth',
    url: process.env.APP_URL || 'http://localhost:3000'
  },
  codes: {
    length: 6,
    expireMinutes: 10,
    maxAttempts: 3
  }
};

// Validar configurações
export function validateConfig() {
  const required = [
    'CIRCLE_API_TOKEN',
    'RESEND_API_KEY',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

### 3.2 `lib/circle.ts`
```typescript
import axios from 'axios';
import { config } from './config';

interface CircleMember {
  id: number;
  email: string;
  name: string;
  status: string;
}

export async function verifyCircleMember(email: string): Promise<CircleMember | null> {
  try {
    // Tentar obter token do membro usando email
    const response = await axios.post(
      `${config.circle.apiUrl}/api/v1/headless/auth_token`,
      { email: email.toLowerCase().trim() },
      {
        headers: {
          'Authorization': `Bearer ${config.circle.apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data?.access_token) {
      return null;
    }

    // Buscar dados do membro
    const memberResponse = await axios.get(
      `${config.circle.apiUrl}/api/headless/v1/me`,
      {
        headers: {
          'Authorization': `Bearer ${response.data.access_token}`
        }
      }
    );

    const member = memberResponse.data;
    
    // Verificar se membro está ativo
    if (member && member.status === 'active') {
      return {
        id: member.id,
        email: member.email,
        name: member.name || member.first_name || 'Membro',
        status: member.status
      };
    }

    return null;
  } catch (error) {
    console.error('Circle API error:', error);
    return null;
  }
}
```

### 3.3 `lib/codes.ts`
```typescript
import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { config } from './config';

interface CodeData {
  email: string;
  code: string;
  attempts: number;
  createdAt: number;
  memberId: number;
  memberName: string;
}

// Gerar código numérico
export function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// Salvar código
export async function saveCode(email: string, memberId: number, memberName: string): Promise<string> {
  const code = generateCode();
  const key = `code:${email.toLowerCase()}`;
  
  const data: CodeData = {
    email: email.toLowerCase(),
    code,
    attempts: 0,
    createdAt: Date.now(),
    memberId,
    memberName
  };

  // Salvar com expiração
  await kv.set(key, data, {
    ex: config.codes.expireMinutes * 60 // segundos
  });

  return code;
}

// Verificar código
export async function verifyCode(email: string, code: string): Promise<CodeData | null> {
  const key = `code:${email.toLowerCase()}`;
  const data = await kv.get<CodeData>(key);

  if (!data) {
    return null;
  }

  // Verificar tentativas
  if (data.attempts >= config.codes.maxAttempts) {
    await kv.del(key);
    throw new Error('Código bloqueado por excesso de tentativas');
  }

  // Incrementar tentativas
  data.attempts++;
  await kv.set(key, data, {
    ex: config.codes.expireMinutes * 60
  });

  // Verificar código
  if (data.code !== code) {
    if (data.attempts >= config.codes.maxAttempts) {
      await kv.del(key);
      throw new Error('Código bloqueado por excesso de tentativas');
    }
    return null;
  }

  // Código correto - deletar
  await kv.del(key);
  return data;
}

// Rate limiting
export async function checkRateLimit(email: string): Promise<boolean> {
  const key = `rate:${email.toLowerCase()}`;
  const attempts = await kv.incr(key);
  
  if (attempts === 1) {
    // Primeira tentativa - setar expiração
    await kv.expire(key, 3600); // 1 hora
  }
  
  return attempts <= 3; // máximo 3 por hora
}
```

### 3.4 `lib/email.ts`
```typescript
import { Resend } from 'resend';
import { config } from './config';

const resend = new Resend(config.email.apiKey);

interface EmailOptions {
  to: string;
  code: string;
  name: string;
}

export async function sendVerificationEmail({ to, code, name }: EmailOptions): Promise<boolean> {
  try {
    const subject = `${code} - Seu código de verificação`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código de Verificação</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo {
            font-size: 32px;
            margin-bottom: 16px;
          }
          .code-box {
            background-color: #f3f4f6;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            margin: 32px 0;
          }
          .code {
            font-size: 36px;
            font-weight: bold;
            color: #5850ec;
            letter-spacing: 8px;
            font-family: monospace;
          }
          .info {
            color: #6b7280;
            font-size: 14px;
            text-align: center;
            margin-top: 24px;
          }
          .warning {
            background-color: #fef3c7;
            border-radius: 6px;
            padding: 16px;
            margin-top: 24px;
            font-size: 14px;
            color: #92400e;
          }
          .footer {
            text-align: center;
            margin-top: 32px;
            font-size: 12px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔐</div>
            <h1>Código de Verificação</h1>
          </div>
          
          <p>Olá ${name},</p>
          
          <p>Você solicitou acesso ao ${config.app.name}. Use o código abaixo para completar sua autenticação:</p>
          
          <div class="code-box">
            <div class="code">${code}</div>
          </div>
          
          <div class="info">
            Este código expira em ${config.codes.expireMinutes} minutos.
          </div>
          
          <div class="warning">
            ⚠️ <strong>Importante:</strong> Não compartilhe este código com ninguém. 
            Nossa equipe nunca pedirá seu código de verificação.
          </div>
          
          <div class="footer">
            <p>Se você não solicitou este código, ignore este email.</p>
            <p>${config.email.fromName}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Olá ${name},

Seu código de verificação é: ${code}

Este código expira em ${config.codes.expireMinutes} minutos.

Se você não solicitou este código, ignore este email.

${config.email.fromName}
    `;

    const result = await resend.emails.send({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: [to],
      subject,
      html,
      text
    });

    return result.error === null;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}
```

### 3.5 `lib/tokens.ts`
```typescript
import jwt from 'jsonwebtoken';
import { config } from './config';

export interface TokenPayload {
  memberId: number;
  email: string;
  name: string;
  communityUrl: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(
    {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      iss: config.app.name
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
      audience: 'mcp-client',
      issuer: config.app.name
    }
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      audience: 'mcp-client',
      issuer: config.app.name
    }) as any;

    return {
      memberId: decoded.memberId,
      email: decoded.email,
      name: decoded.name,
      communityUrl: decoded.communityUrl
    };
  } catch (error) {
    return null;
  }
}
```

### 3.6 `api/validate.ts`
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyCircleMember } from '../lib/circle';
import { saveCode, checkRateLimit } from '../lib/codes';
import { sendVerificationEmail } from '../lib/email';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  // Validar email
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Validar formato
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }

  try {
    // Rate limiting
    const canProceed = await checkRateLimit(normalizedEmail);
    if (!canProceed) {
      return res.status(429).json({ 
        error: 'Muitas tentativas. Tente novamente em 1 hora.' 
      });
    }

    // Verificar no Circle
    const member = await verifyCircleMember(normalizedEmail);
    
    if (!member) {
      return res.status(404).json({ 
        error: 'Email não encontrado na comunidade' 
      });
    }

    // Gerar e salvar código
    const code = await saveCode(normalizedEmail, member.id, member.name);

    // Enviar email
    const emailSent = await sendVerificationEmail({
      to: normalizedEmail,
      code,
      name: member.name
    });

    if (!emailSent) {
      return res.status(500).json({ 
        error: 'Erro ao enviar email. Tente novamente.' 
      });
    }

    // Resposta de sucesso
    res.status(200).json({
      success: true,
      message: 'Código enviado para seu email',
      expiresIn: 600 // 10 minutos
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ 
      error: 'Erro interno. Tente novamente.' 
    });
  }
}
```

### 3.7 `api/verify.ts`
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyCode } from '../lib/codes';
import { generateToken } from '../lib/tokens';
import { config } from '../lib/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email e código são obrigatórios' });
  }

  try {
    // Verificar código
    const codeData = await verifyCode(email.toLowerCase().trim(), code.trim());

    if (!codeData) {
      return res.status(401).json({ 
        error: 'Código inválido ou expirado' 
      });
    }

    // Gerar token JWT
    const token = generateToken({
      memberId: codeData.memberId,
      email: codeData.email,
      name: codeData.memberName,
      communityUrl: config.circle.communityUrl
    });

    // Resposta de sucesso
    res.status(200).json({
      success: true,
      token,
      expiresIn: config.jwt.expiresIn
    });

  } catch (error: any) {
    console.error('Verify error:', error);
    
    if (error.message?.includes('bloqueado')) {
      return res.status(429).json({ 
        error: error.message 
      });
    }

    res.status(500).json({ 
      error: 'Erro ao verificar código' 
    });
  }
}
```

### 3.8 `api/health.ts`
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'healthy',
    service: 'Circle Auth Simple',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}
```

## 🎨 Passo 4: Frontend

### 4.1 `public/index.html`
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Autenticação Circle</title>
    <link rel="stylesheet" href="style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="container">
        <!-- Step 1: Email -->
        <div id="step-email" class="step active">
            <div class="logo">🔐</div>
            <h1>Autenticação Circle</h1>
            <p>Digite o email usado na comunidade Circle</p>
            
            <form id="email-form">
                <input 
                    type="email" 
                    id="email-input" 
                    placeholder="seu@email.com"
                    required
                    autocomplete="email"
                >
                <button type="submit" id="send-code-btn">
                    Enviar código
                </button>
            </form>
            
            <div class="error" id="email-error"></div>
        </div>

        <!-- Step 2: Code -->
        <div id="step-code" class="step">
            <div class="logo">📧</div>
            <h1>Verifique seu email</h1>
            <p>Enviamos um código de 6 dígitos para:</p>
            <p class="email-display" id="email-display"></p>
            
            <form id="code-form">
                <div class="code-inputs">
                    <input type="text" maxlength="1" class="code-input" data-index="0">
                    <input type="text" maxlength="1" class="code-input" data-index="1">
                    <input type="text" maxlength="1" class="code-input" data-index="2">
                    <input type="text" maxlength="1" class="code-input" data-index="3">
                    <input type="text" maxlength="1" class="code-input" data-index="4">
                    <input type="text" maxlength="1" class="code-input" data-index="5">
                </div>
                <button type="submit" id="verify-code-btn">
                    Verificar código
                </button>
            </form>
            
            <div class="error" id="code-error"></div>
            
            <div class="resend">
                <button type="button" id="change-email-btn" class="link-btn">
                    Alterar email
                </button>
                <span class="separator">•</span>
                <button type="button" id="resend-btn" class="link-btn">
                    Reenviar código
                </button>
            </div>
        </div>

        <!-- Step 3: Success -->
        <div id="step-success" class="step">
            <div class="logo success-icon">✅</div>
            <h1>Autenticação concluída!</h1>
            <p>Copie o token abaixo e cole no Claude:</p>
            
            <div class="token-container">
                <div class="token-box" id="token-display"></div>
                <button type="button" id="copy-token-btn" class="copy-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copiar
                </button>
            </div>
            
            <div class="instructions">
                <h3>Próximos passos:</h3>
                <ol>
                    <li>Copie o token acima</li>
                    <li>Volte para o Claude</li>
                    <li>Cole o token quando solicitado</li>
                    <li>Pronto! Você poderá usar o MCP</li>
                </ol>
            </div>
            
            <div class="warning">
                ⚠️ Este token é pessoal e intransferível. Não compartilhe com ninguém.
            </div>
        </div>
    </div>
    
    <script src="script.js"></script>
</body>
</html>
```

### 4.2 `public/style.css`
```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f3f4f6;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: #111827;
}

.container {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    padding: 48px 40px;
    max-width: 480px;
    width: 100%;
}

.step {
    display: none;
}

.step.active {
    display: block;
    animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.logo {
    font-size: 64px;
    text-align: center;
    margin-bottom: 24px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.success-icon {
    animation: scaleIn 0.4s ease-out;
}

@keyframes scaleIn {
    from {
        transform: scale(0);
    }
    to {
        transform: scale(1);
    }
}

h1 {
    font-size: 28px;
    font-weight: 700;
    text-align: center;
    margin-bottom: 12px;
    color: #111827;
}

p {
    text-align: center;
    color: #6b7280;
    margin-bottom: 32px;
    font-size: 16px;
    line-height: 1.5;
}

form {
    width: 100%;
}

input[type="email"] {
    width: 100%;
    padding: 16px 20px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 16px;
    transition: all 0.2s;
    background: #f9fafb;
    font-family: inherit;
}

input[type="email"]:focus {
    outline: none;
    border-color: #5850ec;
    background: white;
    box-shadow: 0 0 0 3px rgba(88, 80, 236, 0.1);
}

button[type="submit"] {
    width: 100%;
    padding: 16px 24px;
    background: #5850ec;
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 16px;
    font-family: inherit;
}

button[type="submit"]:hover:not(:disabled) {
    background: #4338ca;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(88, 80, 236, 0.25);
}

button[type="submit"]:active:not(:disabled) {
    transform: translateY(0);
}

button[type="submit"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.error {
    margin-top: 16px;
    padding: 12px 16px;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 8px;
    color: #dc2626;
    font-size: 14px;
    display: none;
    animation: shake 0.3s ease-in-out;
}

.error.show {
    display: block;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}

.email-display {
    font-weight: 600;
    color: #111827;
    margin-bottom: 32px !important;
    font-size: 18px;
}

.code-inputs {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    margin-bottom: 24px;
}

.code-input {
    width: 100%;
    aspect-ratio: 1;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 24px;
    font-weight: 600;
    text-align: center;
    transition: all 0.2s;
    background: #f9fafb;
    font-family: 'SF Mono', Monaco, monospace;
}

.code-input:focus {
    outline: none;
    border-color: #5850ec;
    background: white;
    box-shadow: 0 0 0 3px rgba(88, 80, 236, 0.1);
}

.code-input.filled {
    background: white;
    border-color: #5850ec;
}

.resend {
    text-align: center;
    margin-top: 24px;
    font-size: 14px;
    color: #6b7280;
}

.link-btn {
    background: none;
    border: none;
    color: #5850ec;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    padding: 4px 8px;
    border-radius: 4px;
}

.link-btn:hover {
    background: rgba(88, 80, 236, 0.05);
    color: #4338ca;
}

.separator {
    margin: 0 8px;
    color: #d1d5db;
}

.token-container {
    position: relative;
    margin-bottom: 32px;
}

.token-box {
    background: #f3f4f6;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    padding: 20px;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 14px;
    word-break: break-all;
    line-height: 1.6;
    color: #374151;
    user-select: all;
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
}

.copy-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #374151;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.copy-btn:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.copy-btn.copied {
    background: #10b981;
    color: white;
    border-color: #10b981;
}

.copy-btn svg {
    width: 16px;
    height: 16px;
}

.instructions {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
}

.instructions h3 {
    font-size: 16px;
    font-weight: 600;
    color: #0369a1;
    margin-bottom: 12px;
}

.instructions ol {
    list-style: none;
    counter-reset: step-counter;
    color: #0c4a6e;
    font-size: 14px;
}

.instructions li {
    counter-increment: step-counter;
    position: relative;
    padding-left: 32px;
    margin-bottom: 8px;
    line-height: 1.5;
}

.instructions li::before {
    content: counter(step-counter);
    position: absolute;
    left: 0;
    top: 0;
    background: #0ea5e9;
    color: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
}

.warning {
    background: #fef3c7;
    border: 1px solid #fcd34d;
    border-radius: 12px;
    padding: 16px 20px;
    font-size: 14px;
    color: #78350f;
    line-height: 1.5;
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

/* Loading states */
.loading {
    position: relative;
    color: transparent !important;
}

.loading::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    top: 50%;
    left: 50%;
    margin-left: -10px;
    margin-top: -10px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    border-top-color: transparent;
    animation: spinner 0.8s linear infinite;
}

@keyframes spinner {
    to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 480px) {
    .container {
        padding: 32px 24px;
    }
    
    h1 {
        font-size: 24px;
    }
    
    .code-inputs {
        gap: 8px;
    }
    
    .code-input {
        font-size: 20px;
    }
}
```

### 4.3 `public/script.js`
```javascript
// State
let currentEmail = '';
let currentStep = 'email';

// Elements
const steps = {
    email: document.getElementById('step-email'),
    code: document.getElementById('step-code'),
    success: document.getElementById('step-success')
};

const forms = {
    email: document.getElementById('email-form'),
    code: document.getElementById('code-form')
};

const inputs = {
    email: document.getElementById('email-input'),
    codeInputs: document.querySelectorAll('.code-input')
};

const buttons = {
    sendCode: document.getElementById('send-code-btn'),
    verifyCode: document.getElementById('verify-code-btn'),
    changeEmail: document.getElementById('change-email-btn'),
    resend: document.getElementById('resend-btn'),
    copyToken: document.getElementById('copy-token-btn')
};

const displays = {
    email: document.getElementById('email-display'),
    token: document.getElementById('token-display')
};

const errors = {
    email: document.getElementById('email-error'),
    code: document.getElementById('code-error')
};

// Helper functions
function showStep(step) {
    Object.values(steps).forEach(s => s.classList.remove('active'));
    steps[step].classList.add('active');
    currentStep = step;
}

function showError(type, message) {
    const error = errors[type];
    error.textContent = message;
    error.classList.add('show');
    setTimeout(() => error.classList.remove('show'), 5000);
}

function hideError(type) {
    errors[type].classList.remove('show');
}

function setLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.classList.remove('loading');
    }
}

// Code input handling
function setupCodeInputs() {
    inputs.codeInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            if (value.length === 1) {
                input.classList.add('filled');
                if (index < inputs.codeInputs.length - 1) {
                    inputs.codeInputs[index + 1].focus();
                }
            } else {
                input.classList.remove('filled');
            }
            
            // Auto submit when all filled
            const code = getCode();
            if (code.length === 6) {
                forms.code.dispatchEvent(new Event('submit'));
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs.codeInputs[index - 1].focus();
            }
        });
        
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = e.clipboardData.getData('text').replace(/\D/g, '');
            const chars = paste.split('').slice(0, 6);
            
            chars.forEach((char, i) => {
                if (inputs.codeInputs[i]) {
                    inputs.codeInputs[i].value = char;
                    inputs.codeInputs[i].classList.add('filled');
                }
            });
            
            if (chars.length === 6) {
                forms.code.dispatchEvent(new Event('submit'));
            }
        });
    });
}

function getCode() {
    return Array.from(inputs.codeInputs).map(i => i.value).join('');
}

function clearCode() {
    inputs.codeInputs.forEach(input => {
        input.value = '';
        input.classList.remove('filled');
    });
    inputs.codeInputs[0].focus();
}

// API calls
async function sendCode(email) {
    const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar código');
    }
    
    return data;
}

async function verifyCode(email, code) {
    const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Código inválido');
    }
    
    return data;
}

// Event handlers
forms.email.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('email');
    
    const email = inputs.email.value.trim();
    if (!email) return;
    
    setLoading(buttons.sendCode, true);
    
    try {
        await sendCode(email);
        currentEmail = email;
        displays.email.textContent = email;
        showStep('code');
        clearCode();
    } catch (error) {
        showError('email', error.message);
    } finally {
        setLoading(buttons.sendCode, false);
    }
});

forms.code.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('code');
    
    const code = getCode();
    if (code.length !== 6) {
        showError('code', 'Digite o código completo');
        return;
    }
    
    setLoading(buttons.verifyCode, true);
    
    try {
        const { token } = await verifyCode(currentEmail, code);
        displays.token.textContent = token;
        showStep('success');
    } catch (error) {
        showError('code', error.message);
        clearCode();
    } finally {
        setLoading(buttons.verifyCode, false);
    }
});

buttons.changeEmail.addEventListener('click', () => {
    showStep('email');
    inputs.email.value = currentEmail;
    inputs.email.focus();
});

buttons.resend.addEventListener('click', async () => {
    hideError('code');
    setLoading(buttons.resend, true);
    
    try {
        await sendCode(currentEmail);
        clearCode();
        showError('code', '✓ Código reenviado');
        errors.code.style.background = '#d1fae5';
        errors.code.style.borderColor = '#6ee7b7';
        errors.code.style.color = '#065f46';
        setTimeout(() => {
            errors.code.style.background = '';
            errors.code.style.borderColor = '';
            errors.code.style.color = '';
        }, 3000);
    } catch (error) {
        showError('code', error.message);
    } finally {
        setLoading(buttons.resend, false);
    }
});

buttons.copyToken.addEventListener('click', async () => {
    const token = displays.token.textContent;
    
    try {
        await navigator.clipboard.writeText(token);
        buttons.copyToken.classList.add('copied');
        buttons.copyToken.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copiado!
        `;
        
        setTimeout(() => {
            buttons.copyToken.classList.remove('copied');
            buttons.copyToken.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copiar
            `;
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
    }
});

// Initialize
setupCodeInputs();
inputs.email.focus();

// Handle browser back button
window.addEventListener('popstate', () => {
    if (currentStep === 'code') {
        showStep('email');
    }
});
```

## 🚀 Passo 5: Deploy na Vercel

### 5.1 Preparar para Deploy
```bash
# Verificar se tudo está funcionando localmente
npm run dev

# Testar build
npm run build
```

### 5.2 Deploy
```bash
# Login na Vercel
vercel login

# Deploy
vercel

# Seguir instruções e escolher:
# - Nome do projeto: circle-auth-simple
# - Framework: Other
# - Build command: (deixar vazio)
# - Output directory: (deixar vazio)
# - Development command: npm run dev
```

### 5.3 Configurar Variáveis de Ambiente

No dashboard da Vercel:
1. Settings → Environment Variables
2. Adicionar todas as variáveis do `.env.local`
3. Deploy em produção: `vercel --prod`

### 5.4 Configurar Vercel KV

1. Storage → Create Database → KV
2. Nome: `circle-auth-kv`
3. Region: Mais próxima
4. Connect to Project

### 5.5 Configurar Resend

1. Criar conta em [resend.com](https://resend.com)
2. Verificar domínio (ou usar domínio sandbox)
3. Gerar API Key
4. Adicionar no Vercel

## 🔧 Passo 6: Integração com MCP

### 6.1 Módulo de Autenticação para MCP
```javascript
// mcp-auth.js
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class CircleAuth {
    constructor(authUrl = 'https://auth.seu-site.vercel.app') {
        this.authUrl = authUrl;
        this.tokenPath = path.join(os.homedir(), '.config', 'mcp-circle', 'token');
    }
    
    async getToken() {
        try {
            // Verificar token existente
            const token = await this.loadToken();
            if (token && await this.validateToken(token)) {
                return token;
            }
        } catch (error) {
            // Token não existe ou é inválido
        }
        
        // Solicitar nova autenticação
        console.log('\n🔐 Autenticação necessária!');
        console.log(`\nAcesse: ${this.authUrl}\n`);
        console.log('Após receber o token por email, cole abaixo:');
        
        const token = await this.promptToken();
        
        if (await this.validateToken(token)) {
            await this.saveToken(token);
            console.log('\n✅ Autenticação concluída!\n');
            return token;
        } else {
            throw new Error('Token inválido');
        }
    }
    
    async loadToken() {
        try {
            return await fs.readFile(this.tokenPath, 'utf-8');
        } catch {
            return null;
        }
    }
    
    async saveToken(token) {
        await fs.mkdir(path.dirname(this.tokenPath), { recursive: true });
        await fs.writeFile(this.tokenPath, token, { mode: 0o600 });
    }
    
    async validateToken(token) {
        // Validação básica do JWT
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            const exp = payload.exp * 1000;
            
            return Date.now() < exp;
        } catch {
            return false;
        }
    }
    
    async promptToken() {
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            readline.question('Token: ', (token) => {
                readline.close();
                resolve(token.trim());
            });
        });
    }
    
    async clearToken() {
        try {
            await fs.unlink(this.tokenPath);
        } catch {
            // Ignorar se não existe
        }
    }
}

module.exports = CircleAuth;
```

### 6.2 Integrar no MCP
```javascript
// No seu MCP principal
const CircleAuth = require('./mcp-auth');

class YourMCP {
    constructor() {
        this.auth = new CircleAuth();
        this.authenticated = false;
    }
    
    async initialize() {
        try {
            await this.auth.getToken();
            this.authenticated = true;
        } catch (error) {
            console.error('Falha na autenticação:', error.message);
            process.exit(1);
        }
    }
    
    async handleRequest(request) {
        // Verificar autenticação antes de processar
        if (!this.authenticated) {
            return {
                error: 'Não autenticado. Reinicie o MCP.'
            };
        }
        
        // Processar request normalmente
        // ...
    }
}
```

## 🔒 Passo 7: Segurança e Melhorias

### 7.1 Rate Limiting Avançado
```typescript
// lib/rate-limit.ts
import { kv } from '@vercel/kv';

export async function checkAdvancedRateLimit(identifier: string, action: string) {
    const limits = {
        'send-code': { window: 3600, max: 3 },      // 3 por hora
        'verify-code': { window: 300, max: 5 },     // 5 por 5 min
        'global': { window: 86400, max: 20 }        // 20 por dia
    };
    
    const limit = limits[action] || limits.global;
    const key = `rate:${action}:${identifier}`;
    
    const count = await kv.incr(key);
    if (count === 1) {
        await kv.expire(key, limit.window);
    }
    
    return count <= limit.max;
}
```

### 7.2 Logging e Monitoramento
```typescript
// lib/logger.ts
export async function logAuthEvent(event: {
    type: 'code_sent' | 'code_verified' | 'code_failed';
    email: string;
    ip?: string;
    userAgent?: string;
}) {
    await kv.lpush('auth_logs', {
        ...event,
        timestamp: new Date().toISOString()
    });
    
    // Manter apenas últimos 1000 logs
    await kv.ltrim('auth_logs', 0, 999);
}
```

### 7.3 Webhook para Notificações
```typescript
// api/webhook.ts
export async function notifyNewAuth(member: any, token: string) {
    if (process.env.WEBHOOK_URL) {
        await fetch(process.env.WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: 'new_authentication',
                member: {
                    id: member.id,
                    email: member.email,
                    name: member.name
                },
                timestamp: new Date().toISOString()
            })
        });
    }
}
```

## 📊 Passo 8: Monitoramento

### 8.1 Dashboard Simples
```typescript
// api/stats.ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Proteger com senha simples
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const stats = {
        totalAuths: await kv.get('stats:total_auths') || 0,
        dailyAuths: await kv.get('stats:daily_auths') || 0,
        activeTokens: await kv.get('stats:active_tokens') || 0,
        recentLogs: await kv.lrange('auth_logs', 0, 19)
    };
    
    res.status(200).json(stats);
}
```

## 🎉 Conclusão

Seu sistema de autenticação está pronto! 

**Características:**
- ✅ Simples e elegante
- ✅ Seguro com validação por email
- ✅ Interface moderna
- ✅ Fácil integração com MCPs
- ✅ Hospedagem gratuita na Vercel

**URLs importantes:**
- Produção: `https://circle-auth-simple.vercel.app`
- Health Check: `/api/health`
- Stats: `/api/stats` (com auth)

**Próximos passos opcionais:**
1. Adicionar suporte a múltiplos MCPs
2. Dashboard administrativo
3. Logs detalhados
4. Notificações por webhook
5. Suporte a 2FA