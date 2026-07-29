# Mis Pendientes

App web para gestionar tareas, correos por responder, correos por enviar y notas, con fechas, prioridades y resumen diario. Los datos se guardan en **Supabase** y la página se publica como sitio estático en **GitHub Pages**, para abrirla desde cualquier dispositivo.

## Qué incluye este proyecto

- `index.html` — la página
- `styles.css` — el diseño
- `config.js` — la conexión a Supabase (URL y clave pública)
- `app.js` — la lógica (agregar, marcar, reagendar, resumen)
- `schema.sql` — la estructura de la base de datos (ya aplicada en Supabase)

La base de datos ya está creada en el proyecto de Supabase `powzgmsrzfzqvsogegxb`, tabla `notas_pendientes`. La app funciona apenas se publique.

## Publicar en GitHub Pages (paso a paso)

1. Entra a https://github.com e inicia sesión (o crea una cuenta gratis).
2. Arriba a la derecha, botón **+** → **New repository**.
3. Nombre del repositorio: por ejemplo `mis-pendientes`. Marca **Public**. Clic en **Create repository**.
4. En el repo vacío, clic en **uploading an existing file** (o **Add file → Upload files**).
5. Arrastra estos 4 archivos: `index.html`, `styles.css`, `config.js`, `app.js`. Clic en **Commit changes**.
6. Ve a **Settings** (del repositorio) → menú lateral **Pages**.
7. En **Source**, elige **Deploy from a branch**; en **Branch** elige `main` y carpeta `/ (root)`. **Save**.
8. Espera 1–2 minutos. GitHub te mostrará el link, tipo:
   `https://TU-USUARIO.github.io/mis-pendientes/`

Ese es el link que abres desde el celular o cualquier computadora. ¡Listo!

## Notas

- `config.js` contiene la **clave pública** de Supabase (publishable). Es segura para el navegador; NO es una clave secreta.
- Por ahora la app **no pide contraseña**: cualquiera con el link puede verla. Para hacerla privada se agrega Supabase Auth (login con correo) y se cambia la política en `schema.sql` por una basada en `auth.uid()`.
