import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";

import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 20, // Conexiones máximas simultáneas en el pool
  idleTimeoutMillis: 30000, // Tiempo de inactividad antes de cerrar un cliente liberado
  connectionTimeoutMillis: 5000 // Tiempo máximo de espera para obtener un cliente
});

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(100) NOT NULL,
        correo VARCHAR(100) UNIQUE NOT NULL,
        contrasena_hash TEXT NOT NULL,
        moneda VARCHAR(10) DEFAULT 'USD',
        google_id VARCHAR(100) UNIQUE,
        avatar_url TEXT,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        icono VARCHAR(50),
        tipo VARCHAR(20) CHECK (tipo IN ('ingreso', 'gasto')),
        es_personalizada BOOLEAN DEFAULT FALSE,
        usuario_id UUID REFERENCES usuarios(id)
      );

      CREATE TABLE IF NOT EXISTS transacciones (
        id SERIAL PRIMARY KEY,
        usuario_id UUID REFERENCES usuarios(id),
        tipo VARCHAR(20) CHECK (tipo IN ('ingreso', 'gasto')),
        monto DECIMAL(12, 2) NOT NULL,
        descripcion TEXT,
        fecha_transaccion DATE NOT NULL,
        categoria_id INTEGER REFERENCES categorias(id),
        categoria_ia VARCHAR(100),
        etiquetas_ia TEXT[],
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS presupuestos (
        id SERIAL PRIMARY KEY,
        usuario_id UUID REFERENCES usuarios(id),
        categoria_id INTEGER REFERENCES categorias(id),
        monto_limite DECIMAL(12, 2) NOT NULL,
        mes INTEGER NOT NULL,
        anio INTEGER NOT NULL,
        UNIQUE(usuario_id, categoria_id, mes, anio)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS perspectivas_ia (
        id SERIAL PRIMARY KEY,
        usuario_id UUID REFERENCES usuarios(id),
        tipo VARCHAR(50),
        contenido TEXT NOT NULL,
        activo BOOLEAN DEFAULT TRUE,
        generado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure migration columns exist
    try {
      await client.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) UNIQUE;");
      await client.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar_url TEXT;");
    } catch (columnErr) {
      console.warn("Migration columns google_id / avatar_url already set or skipped:", columnErr);
    }

    // --- Enforce Foreign Key Cascades & Deletes ---
    try {
      await client.query(`
        ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_usuario_id_fkey;
        ALTER TABLE categorias ADD CONSTRAINT categorias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
      `);
      await client.query(`
        ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_usuario_id_fkey;
        ALTER TABLE transacciones ADD CONSTRAINT transacciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
      `);
      await client.query(`
        ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_categoria_id_fkey;
        ALTER TABLE transacciones ADD CONSTRAINT transacciones_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL;
      `);
      await client.query(`
        ALTER TABLE presupuestos DROP CONSTRAINT IF EXISTS presupuestos_usuario_id_fkey;
        ALTER TABLE presupuestos ADD CONSTRAINT presupuestos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
      `);
      await client.query(`
        ALTER TABLE presupuestos DROP CONSTRAINT IF EXISTS presupuestos_categoria_id_fkey;
        ALTER TABLE presupuestos ADD CONSTRAINT presupuestos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE;
      `);
      await client.query(`
        ALTER TABLE perspectivas_ia DROP CONSTRAINT IF EXISTS perspectivas_ia_usuario_id_fkey;
        ALTER TABLE perspectivas_ia ADD CONSTRAINT perspectivas_ia_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
      `);
    } catch (constraintErr) {
      console.warn("Constraint updates skipped or already configured:", constraintErr);
    }

    // --- Create Custom Highly Efficient Indices ---
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transacciones_usuario_id ON transacciones(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_transacciones_categoria_id ON transacciones(categoria_id);
      CREATE INDEX IF NOT EXISTS idx_transacciones_fecha_transaccion ON transacciones(fecha_transaccion);
      CREATE INDEX IF NOT EXISTS idx_categorias_usuario_id ON categorias(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_presupuestos_usuario_id ON presupuestos(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_perspectivas_ia_usuario_id ON perspectivas_ia(usuario_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_usuario_nombre_tipo ON categorias (usuario_id, nombre, tipo) WHERE usuario_id IS NOT NULL;
    `);

    const catCheck = await client.query("SELECT COUNT(*) FROM categorias WHERE usuario_id IS NULL");
    if (parseInt(catCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO categorias (nombre, icono, tipo, es_personalizada) VALUES 
        ('Alimentación', 'Utensils', 'gasto', FALSE),
        ('Transporte', 'Car', 'gasto', FALSE),
        ('Vivienda', 'Home', 'gasto', FALSE),
        ('Salud', 'HeartPulse', 'gasto', FALSE),
        ('Ocio', 'Gamepad2', 'gasto', FALSE),
        ('Sueldo', 'Briefcase', 'ingreso', FALSE),
        ('Inversiones', 'TrendingUp', 'ingreso', FALSE),
        ('Educación', 'GraduationCap', 'gasto', FALSE),
        ('Servicios', 'Lightbulb', 'gasto', FALSE),
        ('Otros Gastos', 'Receipt', 'gasto', FALSE),
        ('Otros Ingresos', 'Coins', 'ingreso', FALSE)
      `);
      console.log("Default categories seeded successfully");
    }

    console.log("Database initialized");
  } catch (err) {
    console.error("Database initialization failed:", err);
  } finally {
    client.release();
  }
}

async function startServer() {
  await initDb();
  const app = express();
  app.use(express.json());
  app.use(cors());

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res) => {
    const { nombre, correo, contrasena, moneda } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(contrasena, 12);
      const result = await pool.query(
        "INSERT INTO usuarios (nombre, correo, contrasena_hash, moneda) VALUES ($1, $2, $3, $4) RETURNING id, nombre, correo, moneda",
        [nombre, correo, hashedPassword, moneda || "USD"]
      );
      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
      res.json({ user, token });
    } catch (err) {
      res.status(400).json({ error: "Email already exists or invalid data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { correo, contrasena } = req.body;
    try {
      const result = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [correo]);
      const user = result.rows[0];
      if (!user || !(await bcrypt.compare(contrasena, user.contrasena_hash))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
      const { contrasena_hash, ...userResult } = user;
      res.json({ user: userResult, token });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // --- Middleware for Protected Routes ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) return res.sendStatus(403);
      req.userId = decoded.userId;
      next();
    });
  };

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query("SELECT id, nombre, correo, moneda, google_id, avatar_url, creado_en FROM usuarios WHERE id = $1", [req.userId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // --- Google OAuth Routes (Popup-Based Flow) ---
  app.get("/api/auth/google/url", (req: any, res) => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return res.status(400).json({
        error: "Google Sign-In no configurado",
        message: "Por favor, configure la variable de entorno GOOGLE_CLIENT_ID en el menú de Settings en AI Studio."
      });
    }

    // Determine target redirect URI dynamically using APP_URL or referrer/host
    let redirectUri;
    if (process.env.APP_URL) {
      redirectUri = `${process.env.APP_URL.replace(/\/$/, "")}/api/auth/google/callback`;
    } else {
      const origin = req.headers["referer"] || req.headers["origin"] || `https://${req.get("host")}`;
      const cleanOrigin = origin.replace(/\/$/, ""); // remove trailing slash
      redirectUri = `${cleanOrigin}/api/auth/google/callback`;
    }

    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account"
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ url: googleAuthUrl });
  });

  app.get("/api/auth/google/callback", async (req: any, res) => {
    const { code } = req.query;
    if (!code) {
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error: 'Falta el código de autorización de Google.' }, '*');
                window.close();
              } else {
                document.body.innerHTML = '<h3>Error de Autenticación</h3><p>Falta el código de autorización de Google.</p>';
              }
            </script>
          </body>
        </html>
      `);
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!googleClientId || !googleClientSecret) {
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error: 'Google OAuth Client ID o Secret no configurados en las variables de entorno.' }, '*');
                window.close();
              } else {
                document.body.innerHTML = '<h3>Error de Autenticación</h3><p>Google OAuth Client ID o Secret no configurados en las variables de entorno de AI Studio.</p>';
              }
            </script>
          </body>
        </html>
      `);
    }

    try {
      // Reconstruct target redirectUri dynamically to match state values during exchange
      let redirectUri;
      if (process.env.APP_URL) {
        redirectUri = `${process.env.APP_URL.replace(/\/$/, "")}/api/auth/google/callback`;
      } else {
        const requestHost = req.get("host");
        const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
        redirectUri = `${isHttps ? "https" : "http"}://${requestHost}/api/auth/google/callback`;
      }

      // Exchange code for token
      const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      });

      const { access_token } = tokenResponse.data;

      // Request user's details
      const userinfoResponse = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const { sub, email, name: rawName, picture } = userinfoResponse.data;
      if (!email) {
        throw new Error("No se pudo obtener el correo de Google para esta cuenta.");
      }

      const name = rawName || email.split("@")[0];

      // Identify or register user
      // 1. Try search by google_id
      let userResult = await pool.query("SELECT id, nombre, correo, moneda, google_id, avatar_url, creado_en FROM usuarios WHERE google_id = $1", [sub]);
      let user;

      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
        // Ensure avatar is up to date if modified in Google settings
        if (user.avatar_url !== picture || user.nombre !== name) {
          const updateRes = await pool.query(
            "UPDATE usuarios SET nombre = $1, avatar_url = COALESCE($2, avatar_url) WHERE id = $3 RETURNING id, nombre, correo, moneda, google_id, avatar_url, creado_en",
            [name, picture, user.id]
          );
          user = updateRes.rows[0];
        }
      } else {
        // 2. Try search by email (to link previous standard email/password logins with Google)
        let emailResult = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [email]);
        if (emailResult.rows.length > 0) {
          const existingUser = emailResult.rows[0];
          const updateRes = await pool.query(
            "UPDATE usuarios SET google_id = $1, avatar_url = COALESCE(avatar_url, $2) WHERE id = $3 RETURNING id, nombre, correo, moneda, google_id, avatar_url, creado_en",
            [sub, picture, existingUser.id]
          );
          user = updateRes.rows[0];
        } else {
          // 3. Register brand-new user
          const tempPassword = Math.random().toString(36).slice(-10) + Date.now().toString();
          const hashedPassword = await bcrypt.hash(tempPassword, 12);
          const insertResult = await pool.query(
            "INSERT INTO usuarios (nombre, correo, contrasena_hash, moneda, google_id, avatar_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre, correo, moneda, google_id, avatar_url, creado_en",
            [name, email, hashedPassword, "USD", sub, picture || null]
          );
          user = insertResult.rows[0];
        }
      }

      // Generate localized JWT Token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_AUTH_SUCCESS',
                  payload: {
                    user: ${JSON.stringify(user)},
                    token: ${JSON.stringify(token)}
                  }
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Excelente! Autenticación de Google exitosa. Esta ventana se cerrará en breve...</p>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("Error in Google OAuth Callback:", err.response?.data || err.message || err);
      const errMsg = err.response?.data?.error_description || err.message || "Fallo en el servidor al autenticar con Google.";
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error: ${JSON.stringify(errMsg)} }, '*');
                window.close();
              } else {
                document.body.innerHTML = '<h3>Error de Autenticación</h3><p>' + ${JSON.stringify(errMsg)} + '</p>';
              }
            </script>
          </body>
        </html>
      `);
    }
  });

  // --- Transaction Routes ---
  app.get("/api/transactions", authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query(
        `SELECT t.*, c.nombre as categoria_nombre, c.icono as categoria_icono 
         FROM transacciones t 
         LEFT JOIN categorias c ON t.categoria_id = c.id 
         WHERE t.usuario_id = $1 
         ORDER BY t.fecha_transaccion DESC`,
        [req.userId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", authenticateToken, async (req: any, res) => {
    const { tipo, monto, descripcion, fecha_transaccion, categoria_id, categoria_ia, etiquetas_ia } = req.body;
    
    // --- Validations ---
    const numericMonto = Number(monto);
    if (isNaN(numericMonto) || numericMonto <= 0) {
      return res.status(400).json({ error: "El monto debe ser un número positivo mayor que cero." });
    }
    if (tipo !== 'ingreso' && tipo !== 'gasto') {
      return res.status(400).json({ error: "Tipo de transacción inválido." });
    }
    if (!fecha_transaccion) {
      return res.status(400).json({ error: "La fecha de la transacción es obligatoria." });
    }

    try {
      // Validar propiedad/existencia del categoria_id y consistencia de tipo
      if (categoria_id) {
        const catCheck = await pool.query(
          "SELECT * FROM categorias WHERE id = $1 AND (usuario_id IS NULL OR usuario_id = $2)",
          [categoria_id, req.userId]
        );
        if (catCheck.rows.length === 0) {
          return res.status(400).json({ error: "La categoría especificada no es válida o no te pertenece." });
        }
        if (catCheck.rows[0].tipo !== tipo) {
          return res.status(400).json({ error: "El tipo de la categoría no coincide con el tipo de movimiento." });
        }
      }

      const insertResult = await pool.query(
        `INSERT INTO transacciones (usuario_id, tipo, monto, descripcion, fecha_transaccion, categoria_id, categoria_ia, etiquetas_ia) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.userId, tipo, numericMonto, descripcion, fecha_transaccion, categoria_id || null, categoria_ia, etiquetas_ia]
      );
      const newTxId = insertResult.rows[0].id;
      const fullResult = await pool.query(
        `SELECT t.*, c.nombre as categoria_nombre, c.icono as categoria_icono 
         FROM transacciones t 
         LEFT JOIN categorias c ON t.categoria_id = c.id 
         WHERE t.id = $1`,
        [newTxId]
      );
      res.json(fullResult.rows[0]);
    } catch (err) {
      console.error("Create transaction error:", err);
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  app.delete("/api/transactions/:id", authenticateToken, async (req: any, res) => {
    try {
      await pool.query("DELETE FROM transacciones WHERE id = $1 AND usuario_id = $2", [req.params.id, req.userId]);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // --- Category Routes ---
  app.get("/api/categories", authenticateToken, async (req: any, res) => {
    const result = await pool.query("SELECT * FROM categorias WHERE usuario_id IS NULL OR usuario_id = $1", [req.userId]);
    res.json(result.rows);
  });

  app.post("/api/categories", authenticateToken, async (req: any, res) => {
    const { nombre, icono, tipo } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: "El nombre de la categoría es obligatorio." });
    }
    if (tipo !== 'ingreso' && tipo !== 'gasto') {
      return res.status(400).json({ error: "Tipo de categoría inválido." });
    }

    try {
      const normalizedNombre = nombre.trim();
      // Evitar race conditions: buscar si ya existe para este usuario (o es global)
      const existing = await pool.query(
        `SELECT * FROM categorias 
         WHERE (usuario_id IS NULL OR usuario_id = $1) 
           AND LOWER(nombre) = LOWER($2) 
           AND tipo = $3`,
        [req.userId, normalizedNombre, tipo]
      );

      if (existing.rows.length > 0) {
        return res.json(existing.rows[0]);
      }

      const result = await pool.query(
        "INSERT INTO categorias (nombre, icono, tipo, es_personalizada, usuario_id) VALUES ($1, $2, $3, TRUE, $4) RETURNING *",
        [normalizedNombre, icono || "Tag", tipo, req.userId]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Create category error:", err);
      res.status(500).json({ error: "No se pudo crear la categoría." });
    }
  });

  // --- Budget Routes ---
  app.get("/api/budgets", authenticateToken, async (req: any, res) => {
    const result = await pool.query(
      `SELECT b.*, c.nombre as categoria_nombre 
       FROM presupuestos b 
       JOIN categorias c ON b.categoria_id = c.id 
       WHERE b.usuario_id = $1`,
      [req.userId]
    );
    res.json(result.rows);
  });

  app.post("/api/budgets", authenticateToken, async (req: any, res) => {
    const { categoria_id, monto_limite, mes, anio } = req.body;
    
    // --- Validations ---
    const numericMonto = Number(monto_limite);
    if (isNaN(numericMonto) || numericMonto <= 0) {
      return res.status(400).json({ error: "El monto límite del presupuesto debe ser un número positivo mayor que cero." });
    }
    const numMes = Number(mes);
    const numAnio = Number(anio);
    if (isNaN(numMes) || numMes < 1 || numMes > 12) {
      return res.status(400).json({ error: "Suministre un número de mes válido entre 1 y 12." });
    }
    if (isNaN(numAnio) || numAnio < 2000 || numAnio > 2100) {
      return res.status(400).json({ error: "Suministre un año válido entre 2000 y 2100." });
    }

    try {
      // Validar que la categoría exista y pertenezca al usuario (o sea global)
      const catCheck = await pool.query(
        "SELECT * FROM categorias WHERE id = $1 AND (usuario_id IS NULL OR usuario_id = $2)",
        [categoria_id, req.userId]
      );
      if (catCheck.rows.length === 0) {
        return res.status(400).json({ error: "La categoría especificada no es válida o no te pertenece." });
      }

      const insertResult = await pool.query(
        `INSERT INTO presupuestos (usuario_id, categoria_id, monto_limite, mes, anio) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (usuario_id, categoria_id, mes, anio) 
         DO UPDATE SET monto_limite = EXCLUDED.monto_limite 
         RETURNING *`,
        [req.userId, categoria_id, numericMonto, numMes, numAnio]
      );
      const newBudgetId = insertResult.rows[0].id;
      const fullResult = await pool.query(
        `SELECT b.*, c.nombre as categoria_nombre 
         FROM presupuestos b 
         JOIN categorias c ON b.categoria_id = c.id 
         WHERE b.id = $1`,
        [newBudgetId]
      );
      res.json(fullResult.rows[0]);
    } catch (err) {
      console.error("Create budget error:", err);
      res.status(500).json({ error: "Failed to create budget" });
    }
  });

  // --- AI Perspectives ---
  app.get("/api/ai-insights", authenticateToken, async (req: any, res) => {
    const result = await pool.query("SELECT * FROM perspectivas_ia WHERE usuario_id = $1 ORDER BY generado_en DESC LIMIT 10", [req.userId]);
    res.json(result.rows);
  });

  app.post("/api/ai-insights", authenticateToken, async (req: any, res) => {
    const { tipo, contenido } = req.body;
    const result = await pool.query(
      "INSERT INTO perspectivas_ia (usuario_id, tipo, contenido) VALUES ($1, $2, $3) RETURNING *",
      [req.userId, tipo, contenido]
    );
    res.json(result.rows[0]);
  });

  // --- Export CSV ---
  app.get("/api/export/csv", authenticateToken, async (req: any, res) => {
    const result = await pool.query(
      `SELECT t.*, c.nombre as categoria_nombre 
       FROM transacciones t 
       LEFT JOIN categorias c ON t.categoria_id = c.id 
       WHERE t.usuario_id = $1 
       ORDER BY t.fecha_transaccion DESC`,
      [req.userId]
    );
    const rows = result.rows;
    let csv = "ID,Fecha,Tipo,Monto,Descripcion,Categoria,IA_Categoria,IA_Etiquetas\n";
    rows.forEach(r => {
      csv += `${r.id},${r.fecha_transaccion},${r.tipo},${r.monto},"${r.descripcion || ""}","${r.categoria_nombre || ""}","${r.categoria_ia || ""}","${(r.etiquetas_ia || []).join(";")}"\n`;
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=transacciones.csv");
    res.send(csv);
  });

  // --- AI Routes (Protected) ---
  app.post("/api/ai/categorize", authenticateToken, async (req: any, res) => {
    const { descripcion, monto, tipo } = req.body;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Categorize this financial transaction: "${descripcion}" for $${monto} (${tipo}). 
        Return a JSON object with:
        1. "categoria_ia": string (e.g. "Alimentación", "Transporte", "Vivienda", "Salud", "Ocio", "Ingresos")
        2. "etiquetas_ia": array of strings (relevant tags like #comida, #oficina, #lujo)
        
        Respond ONLY with the RAW JSON object, no markdown code blocks.`,
        config: {
          responseMimeType: "application/json"
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (err) {
      console.error("AI Error:", err);
      res.status(500).json({ error: "AI categorization failed" });
    }
  });

  app.post("/api/ai/insights", authenticateToken, async (req: any, res) => {
    const { transactions, budgets } = req.body;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze these transactions and budgets:
        Transactions: ${JSON.stringify(transactions.slice(0, 15))}
        Budgets: ${JSON.stringify(budgets)}
        
        Provide in Spanish:
        1. "prediccion_monto": total spending prediction for next week (number).
        2. "recomendaciones": 3 saving tips (array of strings).
        3. "analisis_presupuesto": current budget health summary.
        
        Respond ONLY with the RAW JSON object.`,
        config: {
          responseMimeType: "application/json"
        }
      });
      res.json(JSON.parse(response.text || "{}"));
    } catch (err) {
      res.status(500).json({ error: "AI insights failed" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
