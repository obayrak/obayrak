# obayrak – static copy of https://sites.google.com/view/obayrak

Static GitHub Pages version of the Google Site (185 pages, 184 interactive apps).

## Structure
- `index.html` – home page
- `<section>/<page>/index.html` – each page (same paths as the Google Site), with the menu
- `<section>/<page>/app1.html` – the interactive app that was embedded on that page (unchanged code)
- `style.css` – layout and menu styling
- `.nojekyll` – tells GitHub Pages to serve files as-is

## Publish
1. Create a public repository on GitHub (e.g. `obayrak`).
2. Upload ALL files and folders from this zip to the repository root (Add file -> Upload files, or GitHub Desktop).
3. Settings -> Pages -> Source: "Deploy from a branch", Branch: `main`, folder `/ (root)` -> Save.
4. After about 1 minute the site is live at `https://<your-username>.github.io/obayrak/`.
   (Name the repository `<your-username>.github.io` to get `https://<your-username>.github.io/` instead.)

## Editing
To change an app, edit its `app1.html`. To add a page, copy an existing page folder and add a menu entry
in the `<aside>` of each page (the menu is repeated in every page).