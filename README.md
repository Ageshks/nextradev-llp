# Nextradev Technologies LLP Website

Premium corporate website built with React, Vite, Tailwind CSS, Framer Motion, and Three.js.

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Environment Variables

- `VITE_CONTACT_API_URL` - endpoint for contact form submissions
- `VITE_CAREERS_API_URL` - endpoint for career application submissions
- `VITE_ADMIN_PASSWORD` - admin password for internship management (default demo: nextradev-admin)

## Routes

- `/internships` - internship listings
- `/internships/apply` - internship application form
- `/admin/login` - admin login
- `/admin/internships` - admin dashboard

## Notes

Internship applications are stored in browser localStorage for demo purposes. Replace with a real backend/API for production. Admin auth is client-side demo only.

## Deployment

Deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages). Configure environment variables in the host dashboard.