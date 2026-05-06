# FinSight - Plataforma de Análisis Financiero Personal

FinSight es una aplicación full-stack diseñada para ayudarte a tomar el control total de tus finanzas mediante el poder de la Inteligencia Artificial (Gemini 1.5 Flash). Rastrea transacciones, gestiona presupuestos y obtén predicciones inteligentes en una interfaz moderna y minimalista.

## ✨ Características Principales

- **Gestión de Transacciones**: Registra ingresos y gastos con facilidad.
- **Categorización por IA**: El sistema analiza tus descripciones y sugiere categorías y etiquetas automáticamente.
- **Dashboard Dinámico**: Visualiza tu salud financiera con gráficos interactivos (Recharts).
- **Presupuestos Inteligentes**: Define límites mensuales y recibe alertas visuales cuando te acerques al límite.
- **Perspectivas de IA**: Obtén predicciones de gasto para la próxima semana y recomendaciones de ahorro personalizadas.
- **Exportación de Datos**: Descarga tu historial completo en formato CSV.
- **Seguridad**: Autenticación robusta basada en JWT y cifrado de contraseñas con BCrypt.

## 🛠️ Stack Tecnológico

- **Frontend**: React 18, Tailwind CSS, Zustand (Estado), Recharts, Motion (Animaciones).
- **Backend**: Node.js (Express), PostgreSQL (Supabase), JWT.
- **IA**: Google Gemini 1.5 Flash API.
- **Despliegue**: Render (Servidor + Frontend), Supabase (Base de Datos).

## 🚀 Guía de Despliegue en Render

### 1. Clonar el repositorio
Asegúrate de que tu código esté en un repositorio de GitHub conectado a tu cuenta de Render.

### 2. Configurar el Web Service en Render
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: 20 o superior (Recomendado v24).

### 3. Variables de Entorno (Environment Variables)
Debes configurar las siguientes variables en el panel de Render:

| Variable | Valor de Ejemplo |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `JWT_SECRET` | `TuClaveSecretaMuyLargaYSegura` |
| `SUPABASE_DB_URL` | `postgres://postgres.[ID]:[PASS]@aws-1-us-east-1.pooler.supabase.com:5432/postgres` |
| `GEMINI_API_KEY` | `Tu_API_Key_de_Google_AI_Studio` |

## 📦 Inicialización de la Base de Datos
La aplicación está configurada para inicializar las tablas automáticamente al iniciarse por primera vez. Asegúrate de que el usuario de Supabase tenga permisos para crear tablas o que el esquema coincida con los tipos UUID para el ID de usuario.

## 📧 Contacto e Impulso
Desarrollado como una solución integral para la gestión financiera moderna.

---
*Hecho con ❤️ y Gemini 1.5 Flash.*
