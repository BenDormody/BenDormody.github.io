# Ben Dormody — Portfolio

Hand-built static portfolio: sports analytics, research, software, philosophy, and poetry. No frameworks, no build step — plain HTML/CSS/JS deployable on GitHub Pages.

## Adding content

- **A project card:** add one object to `assets/js/data.js` (with `skills`, `career`, and `links`). That's it — it appears on `/work/` with all filters working (and on the home page if you add its id to `FEATURED_IDS`).
- **A poem:** add it to `poems.json` (in the folder above this repo) and regenerate `assets/js/poems-data.js`, or edit `poems-data.js` directly — the poems page and writing-index previews both render from it.
- **A paper/essay:** drop the PDF in `assets/pdf/`, copy one of the landing pages (`research/elo-dissertation/index.html` or `writing/schrodinger-moral-disengagement/index.html`) into a new folder, and edit the copy.
- **A live app:** put its self-contained HTML in its own folder (see `filmranker/`) and point the card's `links.live` at it.

The former About page now lives on the home page (bio, roles, education, skills).

## Local preview

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Deploy (GitHub Pages)

Push this folder to a repo named `bendormody.github.io` (Settings → Pages → deploy from `main`). If you use a differently-named project repo instead, the site still works because all internal links are relative — but update the two absolute links in `404.html` (`/assets/...`, `/`) to include the repo name.
