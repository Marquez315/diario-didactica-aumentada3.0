# Didáctica Aumentada 3.0 — El Diario

> ## Subir a GitHub en 6 pasos
> 1. Creá un repositorio nuevo en GitHub (público).
> 2. *Add file → Upload files* y arrastrá **todo el contenido** de esta carpeta (no la carpeta en sí). Tiene que incluir la carpeta oculta `.github`; si tu sistema no la muestra, activá "mostrar archivos ocultos" o creala a mano con *Add file → Create new file* y el nombre `.github/workflows/publicar.yml` (pegando el contenido del archivo `publicar.yml`). Después *Commit changes*.
> 3. *Settings → Pages → Source:* **GitHub Actions**.
> 4. *Settings → Secrets and variables → Actions → New repository secret* (pestaña **Secrets**): nombre `BEHOLD_FEED_URL`, valor = la dirección de tu feed de Behold.
> 5. *Actions → Actualizar y publicar el diario → Run workflow*.
> 6. Cuando termine (verde), abrí `https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`.

Diario online estático para **GitHub Pages**. Muestra automáticamente las publicaciones de Instagram y permite sumar notas propias.
Funciona en celulares, tablets y computadoras (Chrome, Edge, Firefox, Safari y Opera actuales), con modo oscuro automático.

## Cómo funciona

```
Instagram ──(API oficial, cada 3 h)──┐
                                     ├─► scripts/build.mjs ─► data/noticias.json ─► GitHub Pages
manual/*.json (notas propias) ───────┘
```

- **GitHub Actions** (`.github/workflows/publicar.yml`) corre cada 3 horas, cuando agregás una nota y a pedido.
- Descarga las imágenes de Instagram al repositorio (`img/ig/`), porque los enlaces de imagen de Instagram caducan.
- Publica el sitio. No hay servidor ni base de datos.

## Puesta en marcha (una sola vez)

1. **Crear el repositorio** en GitHub y subir todo el contenido de esta carpeta a la rama `main`.
2. **Activar Pages:** *Settings → Pages → Build and deployment → Source: GitHub Actions*.
3. **Conectar Instagram** (ver abajo) y guardar el token en *Settings → Secrets and variables → Actions → New repository secret* con el nombre `IG_TOKEN`.
4. En la pestaña *Actions* ejecutá **Actualizar y publicar el diario → Run workflow**. El sitio queda en `https://USUARIO.github.io/REPOSITORIO/`.

### Conectar Instagram (API oficial de Meta)

Este método solo funciona con **una cuenta de la que tengas el control** (la de @didactica_aumentada3.0). No se leen cuentas ajenas ni se hace scraping, que Instagram no permite.

1. La cuenta debe ser **profesional** (Empresa o Creador): *Instagram → Configuración → Tipo de cuenta*.
2. En <https://developers.facebook.com> creá una app (tipo *Empresa*) y agregá el producto **Instagram → API setup with Instagram login**.
3. Agregá la cuenta como *Instagram tester* (si la app está en modo desarrollo) y aceptá la invitación desde Instagram (*Configuración → Sitios web → Invitaciones de prueba*).
4. En *API setup* generá el **token** de la cuenta, con permiso `instagram_business_basic`.
5. Cambialo por un **token de larga duración** (60 días), según la documentación de Meta. El workflow lo renueva solo en cada ejecución, así que no vence mientras el diario siga actualizándose.
6. Guardalo como secreto `IG_TOKEN`.

> Los pasos y nombres del panel de Meta cambian con frecuencia; si algo no coincide, seguí la guía actual de *Instagram API with Instagram Login*.

## Otras formas de traer los posts (sin app de Meta)

### Opción B — Behold (automática, sin crear una app en Meta)
[Behold](https://behold.so) es un servicio externo que se conecta a la cuenta de Instagram (iniciás sesión con ella en su panel) y publica un "feed JSON" con las publicaciones.
1. Creá una cuenta en behold.so, conectá la cuenta de Instagram y creá un feed.
2. Copiá la URL del feed JSON (algo como `https://feeds.behold.so/XXXXXXXX`).
3. Guardala en GitHub como secreto con el nombre `BEHOLD_FEED_URL` (*Settings → Secrets and variables → Actions*).

El diario acumula lo que va trayendo, así que no pierde posts viejos. Según la documentación de Behold, el plan gratuito entrega hasta 6 publicaciones por consulta (los planes pueden cambiar). Si `IG_TOKEN` también existe, se usa `IG_TOKEN`.

### Opción C — Pegar el enlace de cada post (sin cuentas ni tokens)
Abrí `admin.html`, pegá el enlace de la publicación de Instagram (`https://www.instagram.com/p/…`), poné un título y publicá. La nota muestra la publicación original incrustada con el sistema oficial de Instagram. Funciona con cualquier post público, también de otra cuenta, pero cada post se carga a mano.

### Sin ninguna conexión
El diario también funciona solo con notas manuales.

## Publicar una noticia propia

**Opción fácil:** abrí `https://USUARIO.github.io/REPOSITORIO/admin.html`, completá el formulario y apretá *Publicar en GitHub* → *Commit changes*. Requiere permiso de escritura en el repositorio.

**Opción manual:** copiá `manual/_plantilla.json` a `manual/AAAA-MM-DD-titulo.json`, completalo y hacé commit. Los archivos que empiezan con `_` se ignoran.

Para borrar o corregir una nota, eliminá o editá su archivo en `manual/`. Las notas de ejemplo incluidas pueden borrarse.

## Probar en tu computadora

```bash
node scripts/build.mjs          # genera data/noticias.json
python3 -m http.server 8000     # abrir http://localhost:8000
```

## Archivos

| Ruta | Qué es |
|---|---|
| `index.html`, `css/`, `js/` | El diario |
| `admin.html` | Formulario de redacción |
| `manual/` | Notas propias (una por archivo) |
| `data/instagram.json`, `img/ig/` | Copia guardada de Instagram (la crea el workflow) |
| `scripts/build.mjs` | Une Instagram + notas manuales |
| `.github/workflows/publicar.yml` | Automatización |
