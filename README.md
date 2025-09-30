This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Autenticación de usuarios

La aplicación incluye un sistema de registro y acceso basado en [NextAuth](https://next-auth.js.org/) con soporte para credenciales (correo/contraseña) y autenticación con Google. Los formularios solicitan nombre, apellido, correo electrónico, Whatsapp y contraseña, y los datos se almacenan en la base de datos SQLite gestionada con Prisma.

### Variables de entorno

Configura las siguientes variables en un archivo `.env` antes de iniciar el proyecto:

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<cadena aleatoria segura>"
GOOGLE_CLIENT_ID="<id de cliente de Google>"      # Opcional, solo si habilitas Google
GOOGLE_CLIENT_SECRET="<secreto de Google>"        # Opcional, solo si habilitas Google
```

Si no se definen las credenciales de Google, el proveedor no estará disponible en la interfaz. Asegúrate de registrar la app en [Google Cloud Console](https://console.cloud.google.com/).

### Scripts útiles

```bash
# Levantar la app Next.js y el servidor Koa en paralelo
npm run dev

# Aplicar las migraciones de Prisma y generar el cliente
npx prisma migrate dev
npx prisma generate
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
