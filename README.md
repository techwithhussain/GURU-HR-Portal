GDA MIS — HR portal for Guru Digital Advertising, built with Next.js, Prisma, and Postgres.

## Getting Started (new machine)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the env template and fill in real values (DB credentials, `JWT_SECRET`, `CRON_SECRET`, etc.):
   ```bash
   cp .env.example .env
   ```
3. Start Postgres via Docker:
   ```bash
   docker compose up -d postgres
   ```
4. Run migrations and seed the database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
5. Start the dev server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
