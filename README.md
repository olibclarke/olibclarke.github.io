# Clarke Lab website

Static GitHub Pages site for `olibclarke.github.io`.

## Local preview

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

## Deploy

Create the GitHub repository `olibclarke.github.io`, then from this folder:

```bash
git init
git branch -M main
git add .
git commit -m "Initial lab website"
git remote add origin git@github.com:olibclarke/olibclarke.github.io.git
git push -u origin main
```

The site uses plain HTML, CSS, and a small JavaScript file for the mobile menu. There is no build step.

## Editing

- Homepage: `index.html`
- Research: `research.html`
- People: `people.html`
- Selected publications: `publications.html`
- Contact: `contact.html`
- Images: `assets/img/papers/`
- Styles: `assets/css/styles.css`

