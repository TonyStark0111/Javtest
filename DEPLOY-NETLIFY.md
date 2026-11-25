# Deploy on Netlify

This project deploys on Netlify as a standard Next.js site. Netlify detects
Next.js automatically and runs the SSR pages as functions — no extra plugin
or adapter is needed. All build settings come from `netlify.toml` in this
repo, so there is nothing to type into the dashboard's build fields.

## 1. Push the project to a NEW GitHub repo

Create a new GitHub repository and push this whole project to it (the full
project, not just changed files — Netlify needs the complete source).

⚠️ **No secrets in the repo.** This project needs no API keys and no
passwords, so don't add any. Keep `.env.local` out of Git (it's already in
`.gitignore`) — anything you need to set goes in Netlify's environment
variables instead (step 3, and almost nothing is required).

## 2. Create the Netlify site

1. Netlify dashboard → **Add new site** → **Import an existing project**
2. Connect GitHub and pick the new repo
3. Build settings are read from `netlify.toml` automatically:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Framework is detected as **Next.js**
4. Click **Deploy site**

## 3. Environment variables: NONE required

The site runs in zero-setup mode out of the box — it reads the live AVDB API
server-side, so you can deploy with an empty env list.

Optional, only after the first deploy works:

| Var | When / why |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Set to your Netlify URL (e.g. `https://your-site.netlify.app`) so share/embed links and SEO metadata use the real domain — then redeploy |
| `NEXT_PUBLIC_SITE_NAME` | Only if you want a different site name than "JAV English" |
| `MONGODB_URI` | Only later, if you import the catalogue into Mongo with the bundled importer |

That's the whole list. Nothing else is needed.

## 4. Check the first deploy

Open the Netlify URL and check:

- The home page loads with the English-subtitle poster grid
- One video page opens and the player area loads

If both work, the deploy is done.

## Notes

- **Usage:** in zero-setup mode every page view calls AVDB from a Netlify
  function, so function and bandwidth usage grows with traffic. Importing
  into Mongo (`MONGODB_URI`) and putting a CDN in front later reduces that.
- **Content:** Netlify staff state that legal adult (18+) content is allowed
  on Netlify as long as it is legal in the US — their Acceptable Use Policy
  does not ban adult content by name. But they reserve the right to remove
  content at their sole discretion, and their AUP does ban content that
  infringes someone else's intellectual property. AVDB indexes third-party
  rips, so a DMCA complaint could get pages — or the whole site — taken
  down. That's a real risk on Netlify (and on any mainstream host); keep the
  /dmca page contact details current so complaints come to you first.
