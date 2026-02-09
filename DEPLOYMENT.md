# Deployment & Monetization Guide

## 1. Deploying to Vercel (Recommended)

### Quick Start
1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "New Project" → Import your repo
4. Framework: **Vite** (auto-detected)
5. Click "Deploy"

### Environment Variables
In the Vercel dashboard → Settings → Environment Variables, add:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
VITE_ADSENSE_SLOT=XXXXXXXXXX
```

### Custom Domain
1. Go to your project → Settings → Domains
2. Add your domain (e.g., `mygames.com`)
3. Update DNS records as shown by Vercel:
   - **A Record**: `76.76.21.21`
   - **CNAME**: `cname.vercel-dns.com`
4. SSL is automatic

---

## 2. Google AdSense Setup

### Step 1: Sign Up
1. Go to [adsense.google.com](https://adsense.google.com)
2. Sign in with Google and submit your site URL
3. Add the AdSense verification code to `index.html`:

```html
<head>
  <!-- Add before closing </head> tag -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX"
    crossorigin="anonymous"></script>
</head>
```

### Step 2: Get Approved
- Your site needs real content and traffic
- Google typically reviews within 1-2 weeks
- Must comply with AdSense policies (no adult content, etc.)

### Step 3: Create Ad Units
1. In AdSense → Ads → By ad unit
2. Create **Display ads** with these sizes:
   - **728x90 Leaderboard** - for homepage banner
   - **300x250 Medium Rectangle** - for game lobby sidebar
3. Copy the `data-ad-client` and `data-ad-slot` values
4. Set them as environment variables (see above)

### Ad Placement Spots (already coded)
The `AdPlacement` component is ready to use. Import and place it:

```tsx
import AdPlacement from './ui/components/AdPlacement';

// Homepage banner (below header)
<AdPlacement size="leaderboard" className="mx-auto my-4" />

// Game lobby sidebar
<AdPlacement size="medium-rectangle" className="mt-4" />
```

### Revenue Expectations
- Game sites typically earn $1-5 RPM (revenue per 1000 page views)
- With 10k monthly visitors: ~$10-50/month
- Scale with SEO, social sharing, and game variety

---

## 3. Supabase Setup (Backend)

### Step 1: Create Project
1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project (free tier is fine to start)
3. Copy the **Project URL** and **anon key** from Settings → API

### Step 2: Database Schema
Run this SQL in Supabase SQL Editor:

```sql
-- Users table
create table profiles (
  id uuid references auth.users primary key,
  display_name text default 'Player',
  created_at timestamptz default now()
);

-- Game results
create table game_results (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id),
  game_id text not null,
  won boolean not null,
  score integer default 0,
  duration_seconds integer,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Leaderboard view
create view leaderboard as
select
  p.display_name,
  gr.game_id,
  count(*) as games_played,
  count(*) filter (where gr.won) as wins,
  max(gr.score) as best_score
from game_results gr
join profiles p on p.id = gr.user_id
group by p.display_name, gr.game_id
order by wins desc;

-- Enable RLS
alter table profiles enable row level security;
alter table game_results enable row level security;

-- Policies
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Anyone can read game results" on game_results for select to authenticated using (true);
create policy "Users can insert own results" on game_results for insert with check (auth.uid() = user_id);
```

### Step 3: Connect
Set environment variables:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-key
```

---

## 4. Alternative Hosting Options

### Netlify
1. Connect GitHub repo at [netlify.com](https://netlify.com)
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add env vars in Site Settings → Environment

### GitHub Pages
1. Add to `vite.config.ts`:
   ```ts
   base: '/your-repo-name/'
   ```
2. Build and deploy the `dist` folder
3. Limited to static content (no SSR)

### Cloudflare Pages
1. Connect GitHub at [pages.cloudflare.com](https://pages.cloudflare.com)
2. Build command: `npm run build`
3. Output directory: `dist`
4. Free tier includes unlimited bandwidth

---

## 5. SEO & Growth Tips

- Add `<meta>` descriptions for each game page
- Create a `sitemap.xml` with all game URLs
- Share on Reddit (r/webgames, r/indiegaming)
- Add Open Graph tags for social media previews
- Consider PWA support for mobile users (add `manifest.json`)

---

## 6. Alternative Monetization

### Besides AdSense:
- **Ko-fi / Buy Me a Coffee** - Donation button
- **Premium themes** - Sell cosmetic card/board themes
- **Remove ads** - Offer an ad-free tier for $2/month
- **Affiliate links** - Link to physical board game versions on Amazon
