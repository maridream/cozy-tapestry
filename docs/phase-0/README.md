# Phase 0 — Git repository and GitHub

**Goal:** the project folder is a git repository, a matching repository exists on GitHub, and the scaffold is pushed to it.

**Who does it:** steps 1–2 can be done by a worker or by you. Steps 3–5 need **you** (the owner), because they use your GitHub account.

**Prerequisites:** git is installed (it is: 2.50). A free GitHub account.

All commands are run in a terminal opened in the project folder. In VS Code: **Terminal → New Terminal**.

---

## Step 1 — Create the local repository

```bash
git init -b main
```

Check what will be committed. `node_modules/` and `dist/` must **not** appear (the `.gitignore` already excludes them):

```bash
git status --short
```

## Step 2 — First commit

If git has never been used on this computer, tell it who you are first (use the email tied to your GitHub account, or GitHub's private "noreply" address from <https://github.com/settings/emails>):

```bash
git config --global user.name "Your Name"
```

```bash
git config --global user.email "you@example.com"
```

Then commit:

```bash
git add .
```

```bash
git commit -m "Phase 0: project scaffold and plan"
```

## Step 3 — Create the GitHub repository (owner)

1. Sign in at <https://github.com> and open <https://github.com/new>.
2. **Repository name:** `cozy-tapestry`
3. **Description (optional):** Turn a pet photo into a crochet tapestry pattern.
4. **Visibility:** Public. (Free GitHub Pages hosting in Phase 4 needs a public repository unless you have a paid plan.)
5. Leave **Add a README**, **.gitignore** and **license** all **off / None** — the project already has these files, and adding them on GitHub causes a conflict on first push.
6. Click **Create repository**. Keep the page open; it shows your repository address.

## Step 4 — Connect and push (owner)

Replace `YOUR-USERNAME` with your GitHub username:

```bash
git remote add origin https://github.com/YOUR-USERNAME/cozy-tapestry.git
```

```bash
git push -u origin main
```

The first push asks you to sign in:

- **Easiest:** install the GitHub CLI (`brew install gh`), run `gh auth login`, choose *GitHub.com → HTTPS → Login with a web browser*, then run the push again.
- **Or** when prompted for a password, paste a *personal access token* (not your GitHub password). Create one at <https://github.com/settings/tokens> with the `repo` scope.
- **Or** in VS Code, use the **Source Control** panel → **Publish Branch**; VS Code signs you in through the browser.

## Step 5 — Check

Reload the repository page on GitHub. You should see `README.md`, `docs/`, `src/` and the commit "Phase 0: project scaffold and plan".

```bash
git status
```

should say `Your branch is up to date with 'origin/main'`.

---

## Everyday use afterwards

After each phase (or any time you want to save a checkpoint):

```bash
git add .
```

```bash
git commit -m "Phase 1: app shell, themes and upload"
```

```bash
git push
```

## Decisions for the owner in this phase

- **License.** A public repository without a license means others may not legally reuse the code. Decide before Phase 2, because the background-removal library chosen there may require a specific license (see [phase-2](../phase-2/README.md) §"Choosing the library"). MIT is the usual simple choice if the library allows it.

## Troubleshooting

| Message | Fix |
| --- | --- |
| `remote origin already exists` | `git remote set-url origin https://github.com/YOUR-USERNAME/cozy-tapestry.git` |
| `rejected … fetch first` | The GitHub repo was created with a README. Run `git pull --rebase origin main`, then push again. |
| `Authentication failed` | Use one of the three sign-in options in Step 4; GitHub no longer accepts account passwords for git. |
| `src refspec main does not match any` | Nothing has been committed yet — do Step 2 first. |

## Acceptance checklist

- [x] `git log --oneline` shows the scaffold commit.
- [x] `git remote -v` shows the GitHub address.
- [x] The files are visible on github.com.
- [x] `node_modules/` is not in the repository.
- [x] Phase 0 is ticked in [docs/README.md](../README.md).

## Handoff notes

- Repository: <https://github.com/maridream/cozy-tapestry> (public), default branch `main`.
- Commit identity is set per-repo (`git config user.name/user.email`), using the owner's GitHub noreply address — not global.
- The GitHub CLI (`gh`) is installed and signed in as `maridream`, so `git push` works over HTTPS.
- License not chosen yet — owner decides before Phase 2.
