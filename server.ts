import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        correo VARCHAR(100) UNIQUE NOT NULL,
        contrasena_hash TEXT NOT NULL,
        moneda VARCHAR(10) DEFAULT 'USD',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        icono VARCHAR(50),
        tipo VARCHAR(20) CHECK (tipo IN ('ingreso', 'gasto')),
        es_personalizada BOOLEAN DEFAULT FALSE,
        usuario_id INTEGER REFERENCES usuarios(id)
      );

      CREATE TABLE IF NOT EXISTS transacciones (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
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
        usuario_id INTEGER REFERENCES usuarios(id),
        categoria_id INTEGER REFERENCES categorias(id),
        monto_limite DECIMAL(12, 2) NOT NULL,
        mes INTEGER NOT NULL,
        anio INTEGER NOT NULL,
        UNIQUE(usuario_id, categoria_id, mes, anio)
      );

      CREATE TABLE IF NOT EXISTS perspectivas_ia (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
        tipo VARCHAR(50),
        contenido TEXT NOT NULL,
        activo BOOLEAN DEFAULT TRUE,
        generado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
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
    try {
      const result = await pool.query(
        `INSERT INTO transacciones (usuario_id, tipo, monto, descripcion, fecha_transaccion, categoria_id, categoria_ia, etiquetas_ia) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.userId, tipo, monto, descripcion, fecha_transaccion, categoria_id, categoria_ia, etiquetas_ia]
      );
      res.json(result.rows[0]);
    } catch (err) {
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
    const result = await pool.query(
      "INSERT INTO categorias (nombre, icono, tipo, es_personalizada, usuario_id) VALUES ($1, $2, $3, TRUE, $4) RETURNING *",
      [nombre, icono, tipo, req.userId]
    );
    res.json(result.rows[0]);
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
    const result = await pool.query(
      `INSERT INTO presupuestos (usuario_id, categoria_id, monto_limite, mes, anio) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (usuario_id, categoria_id, mes, anio) 
       DO UPDATE SET monto_limite = EXCLUDED.monto_limite 
       RETURNING *`,
      [req.userId, categoria_id, monto_limite, mes, anio]
    );
    res.json(result.rows[0]);
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

  // Vite middleware for development
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
