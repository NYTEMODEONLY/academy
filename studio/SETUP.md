# Sanity Studio Setup for NYTEMODE Academy

Sanity Studio provides a **professional, modern admin interface** with:
- Beautiful dark mode (auto-detects your system preference)
- Real-time collaborative editing
- Powerful rich text editor
- Image hotspot cropping
- Fully customizable

## Quick Setup (5 minutes)

### 1. Install dependencies
```bash
cd studio
npm install
```

### 2. Login to Sanity
```bash
npx sanity login
```
This will open a browser for you to authenticate with Google or GitHub.

### 3. Create your project
```bash
npx sanity init --reconfigure
```
When prompted:
- Create a new project: **Yes**
- Project name: **nytemode-academy**
- Dataset: **production**
- Project output path: **.** (current directory)

### 4. Update config files
The `init` command will update `sanity.config.ts` and `sanity.cli.ts` with your project ID.

### 5. Start the studio
```bash
npm run dev
```
Open http://localhost:3333 to see your beautiful new admin!

### 6. Deploy to Sanity (optional)
```bash
npm run deploy
```
This gives you a hosted studio at: https://nytemode-academy.sanity.studio

## What's Included

### Content Types
- **Courses** - Full course management with categories, thumbnails, prerequisites
- **Lessons** - Linked to courses, with video support and rich content
- **News Articles** - Blog posts with featured article support
- **Site Settings** - Homepage content management

### Features
- Slug auto-generation from titles
- Image hotspot support for smart cropping
- Code block support with syntax highlighting
- Category management
- Premium content flags
- Publishing workflow

## Connecting to Eleventy

You'll need to update your Eleventy build to fetch from Sanity's API instead of local markdown files. I can help with this once the studio is set up.

## Support

- Sanity Docs: https://www.sanity.io/docs
- Sanity Slack: https://slack.sanity.io
