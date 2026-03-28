# ReporTicket - Guía de Usuario

Sistema de gestión de tickets de soporte multi-empresa con roles, departamentos y flujo de trabajo colaborativo.

---

## Tabla de Contenido

1. [Roles y Permisos](#roles-y-permisos)
2. [Inicio de Sesión y Registro](#inicio-de-sesión-y-registro)
3. [Panel Principal (Dashboard)](#panel-principal-dashboard)
4. [Gestión de Tickets](#gestión-de-tickets)
5. [Crear un Ticket](#crear-un-ticket)
6. [Detalle del Ticket](#detalle-del-ticket)
7. [Panel de Administración](#panel-de-administración)
8. [Perfil de Usuario](#perfil-de-usuario)
9. [Configuración del Sistema](#configuración-del-sistema)
10. [Recuperación de Contraseña](#recuperación-de-contraseña)
11. [Personalización](#personalización)

---

## Roles y Permisos

| Rol | Descripción |
|-----|-------------|
| **Super Admin** | Control total del sistema. Gestiona empresas, usuarios, SMTP y base de datos. |
| **Admin** | Administra usuarios y tickets dentro de su empresa. |
| **Supervisor** | Ve todos los tickets, puede asignar y cambiar estado/prioridad. |
| **Customer** | Crea y ve solo sus propios tickets. Puede cerrarlos. |

### Permisos Granulares

Cada usuario puede tener los siguientes permisos habilitados:

- **Ver todos los tickets** — Acceso a todos los tickets de la empresa
- **Asignar tickets** — Reasignar tickets a otros agentes
- **Gestionar usuarios** — Crear, editar y eliminar usuarios
- **Gestionar empresas** — Solo otorgable por Super Admin

---

## Inicio de Sesión y Registro

### Iniciar Sesión
1. Ingresa tu **email** y **contraseña**
2. Marca la casilla **"No soy un robot"** (protección anti-bot)
3. Presiona **Iniciar Sesión**
4. Si olvidaste tu contraseña, usa el enlace **"¿Olvidaste tu contraseña?"**

### Registrar una Empresa
1. Desde la pantalla de inicio, presiona **Registrar Empresa**
2. Completa: Nombre completo, Nombre de la empresa, Email, Contraseña (mínimo 8 caracteres), Teléfono con código de país y Extensión
3. Marca la casilla anti-bot
4. Se crea automáticamente tu empresa con tu cuenta de administrador

---

## Panel Principal (Dashboard)

El dashboard muestra 5 tarjetas de estadísticas interactivas:

| Tarjeta | Descripción |
|---------|-------------|
| **Total Tickets** | Todos los tickets visibles |
| **Tickets Abiertos** | Tickets activos (no cerrados) |
| **Vencidos** | Tickets con estado "Antiguo" |
| **Sin Asignar** | Tickets sin agente asignado |
| **Total Cerrados** | Tickets resueltos |

> **Tip:** Haz clic en cualquier tarjeta para filtrar la lista de actividad reciente.

Cada ticket en la lista muestra: ID, asunto, estado (con badge de color), prioridad y nombre del usuario.

---

## Gestión de Tickets

### Estados del Ticket

| Estado | Color | Descripción |
|--------|-------|-------------|
| **Nuevo** | 🔵 | Ticket recién creado, sin revisar |
| **Abierto** | 🟢 | Revisión iniciada |
| **En Progreso** | 🟡 | Agente trabajando activamente |
| **Esperando Respuesta** | 🟠 | Esperando respuesta del cliente |
| **Antiguo** | 🔴 | Ticket estancado/vencido |
| **Cerrado** | ⚫ | Ticket resuelto |

### Prioridades

- **Baja** — Sin urgencia
- **Media** — Prioridad normal (por defecto)
- **Alta** — Requiere atención inmediata

### Departamentos

- Soporte
- Ventas
- Facturación
- Contabilidad
- Cuentas por Pagar

### Filtros y Búsqueda

- **Barra de búsqueda**: Busca por asunto, ID o nombre de usuario
- **Filtro por estado**: Todos, Nuevo, Abierto, En Progreso, Esperando Respuesta, Antiguo, Cerrado
- **Filtro por departamento**: Todos los departamentos disponibles

---

## Crear un Ticket

1. Presiona **Nuevo Ticket** en el menú lateral
2. Nombre y Email se completan automáticamente
3. Selecciona un **Departamento**
4. Escribe el **Asunto** y **Descripción** del problema
5. Opcionalmente adjunta archivos (arrastrar o hacer clic): jpg, png, pdf, doc, docx, tiff, xls, xlsx
6. Presiona **Crear Ticket**

El ticket se genera con un ID único en formato `tkt-xxxxx-xxxxx`.

---

## Detalle del Ticket

### Conversación
- **Notas públicas**: Visibles para clientes y agentes
- **Notas internas**: Solo visibles para agentes/admins (resaltadas en amarillo)
- **Respuestas rápidas**: Mensajes predefinidos para agilizar respuestas
  - "Hola [nombre], ¿en qué podemos ayudarte?"
  - "Si tienes más preguntas, no dudes en preguntar."
  - "Gracias por contactar a nuestro equipo de soporte."
- **Variables dinámicas**: `[Nombre del Cliente]`, `[ID del Ticket]`, `[Fecha Actual]`
- **Límite de palabras**: 100 palabras máximo por nota
- **Archivos adjuntos**: Arrastra o selecciona archivos

### Panel Lateral
- **Estado / Prioridad / Departamento**: Cambiables por agentes
- **Asignar agente**: Dropdown con todos los agentes/admins de la empresa
- **Guardar cambios**: Persiste las modificaciones

### Cerrar un Ticket (Cliente)
Cuando un cliente cierra un ticket, se activa el **"Ritual de Cierre"**:
1. Mensaje de advertencia sobre responsabilidad
2. Campo obligatorio de notas de cierre
3. Captcha matemático (ej: "7 + 3 = ?")
4. Se registra auditoría con usuario, fecha, hora y razón

> **Nota:** Los tickets cerrados son de solo lectura para clientes. Solo un administrador puede reabrirlos.

---

## Panel de Administración

Accesible para roles **Admin** y **Super Admin**. Tiene tres pestañas:

### 1. Tickets
Vista completa con filtros avanzados y tabla de todos los tickets.

### 2. Usuarios y Empresas

#### Gestión de Empresas (Solo Super Admin)
- **Crear empresa**: Nombre + usuario admin inicial (con generador de contraseña aleatoria)
- **Ver empresas**: Lista con nombre y base de datos
- **Editar empresa**: Cambiar nombre
- **Eliminar empresa**: Borra la empresa y sus usuarios del directorio global

#### Gestión de Usuarios
- **Crear usuario**: Nombre, email, contraseña, rol, empresa
- **Editar usuario**: Nombre, rol, empresa (campos inline)
- **Eliminar usuario**: Con confirmación (no puedes eliminarte a ti mismo)
- **Permisos**: Modal con 4 toggles de permisos granulares

### 3. Configuración (Solo Super Admin)
Ver [Configuración del Sistema](#configuración-del-sistema)

---

## Perfil de Usuario

Accede desde el menú lateral → **Perfil**.

- **Foto de perfil**: Haz clic en el ícono de cámara. Se comprime automáticamente a 300px y se guarda al instante.
- **Nombre**: Editable solo por Super Admin
- **Email**: Editable solo por Super Admin
- **Rol**: Solo lectura

---

## Configuración del Sistema

Solo accesible para **Super Admin**.

### Configuración SMTP (Email)
- **Host**: Servidor SMTP (ej: smtp.gmail.com)
- **Puerto**: 587 (TLS) o 465 (SSL)
- **TLS/SSL**: Activar/desactivar
- **Usuario** y **Contraseña**: Credenciales del servidor
- **Probar conexión**: Envía un email de prueba a la dirección indicada
- **Guardar**: Persiste la configuración

### Configuración de Base de Datos
- **Host**: Servidor MySQL
- **Puerto**: Por defecto 3306
- **Usuario** y **Contraseña**: Credenciales MySQL
- **Base de datos maestra**: Nombre de la BD principal
- **Modo**:
  - **Single (Compartido)**: Todas las empresas en una sola BD
  - **Multi (Aislado)**: Cada empresa con su propia BD
- **Probar conexión**: Verifica conectividad
- **Guardar**: Aplica la configuración (reinicia el servidor)

---

## Recuperación de Contraseña

1. En la pantalla de login, haz clic en **"¿Olvidaste tu contraseña?"**
2. Ingresa tu email registrado
3. Recibirás un correo con un enlace de restablecimiento (válido por 1 hora)
4. Abre el enlace, ingresa tu nueva contraseña (mínimo 8 caracteres)
5. Confirma la contraseña (validación en tiempo real)
6. Presiona **Guardar** y luego **Volver al Inicio de Sesión**

---

## Personalización

### Tema
- **Modo Oscuro** (predeterminado) y **Modo Claro**
- Botón de alternancia en el menú lateral
- Se guarda tu preferencia en el perfil

### Idioma
- **Español** e **Inglés**
- Selector en el menú lateral
- Se guarda tu preferencia en el perfil

---

## Tecnologías

- **Frontend**: React 19 + Vite
- **Backend**: Express.js + MySQL2
- **Autenticación**: bcrypt + tokens de sesión
- **Email**: Nodemailer
- **Anti-bot**: Honeypot + Captcha + Verificación matemática

---

## Inicio Rápido (Desarrollo)

```bash
# Instalar dependencias
npm install

# Ejecutar frontend + backend
npm run dev:all

# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

Variables de entorno en `.env`:
```
DB_HOST=localhost
DB_PORT=3001
DB_USER=root
DB_PASS=
DB_MODE=single
DB_PREFIX=
PORT=3001
```
