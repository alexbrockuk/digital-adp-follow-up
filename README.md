# Digital ADP follow up

Lightweight static follow-up tool for post-account-planning actions. The app keeps the original person-tab workflow, stores progress in browser `localStorage`, and reflects team progress back into the Master tab.

## Run locally

Open `index.html` in a browser.

The app now includes a browser-safe local fallback, so opening `index.html` directly should work in normal `file://` use.

If you prefer to serve it locally instead, or if your environment has unusually strict local file restrictions:

```bash
cd /Users/alex.brock/Code/active/digital-adp-follow-up
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish on GitHub Pages

This project is set up for GitHub Pages deployment via GitHub Actions.

1. Create a new GitHub repository, for example `digital-adp-follow-up`.
2. Push this folder to the repository on the `main` branch.
3. In GitHub, open the repository and go to `Settings` -> `Pages`.
4. Under `Build and deployment`, set `Source` to `GitHub Actions`.
5. Push any change to `main` and GitHub will publish the site.

For a project repository named `digital-adp-follow-up`, the default URL will usually be:

```text
https://<your-github-username>.github.io/digital-adp-follow-up/
```

Important: GitHub Pages sites are publicly accessible by URL. The current app still uses browser `localStorage`, so each teammate will have their own saved progress rather than one shared team state.

## File structure

```text
digital-adp-follow-up/
  index.html
  styles.css
  app.js
  data/
    opportunities.json
    opportunities.inline.js
  README.md
  SPEC.md
```

## Data structure

`data/opportunities.json` is an array of task objects. Each task belongs to an opportunity via `opportunityId` and includes the fields the UI needs to render person tabs, Master summaries, and CSV export.

`data/opportunities.inline.js` mirrors the same data in JavaScript form so the app can still load when a browser blocks `fetch()` access to local JSON files opened directly from disk.

If you update `data/opportunities.json`, update `data/opportunities.inline.js` to match so direct local opening continues to work.

Example:

```json
{
  "id": "r6c6-Alex-acct",
  "opportunityId": "04-merck-aptoll-innovation-ai",
  "account": "Merck ApTOLL",
  "accountLead": "Alex",
  "service": "Innovation / AI",
  "serviceLead": "Ayesha",
  "taskOwner": "Alex",
  "taskType": "account_lead",
  "actionText": "Merck ApTOLL — arrange intro with Ayesha to discuss Innovation / AI"
}
```

`taskType` stays aligned to the current lightweight workflow:

- `account_lead`
- `service_lead`
- `self_led`

## Persistence

- Browser state is stored in `localStorage` under `adp_follow_up_tool_v2`.
- Task IDs are stable, so saved progress survives refreshes.
- Notes and checkbox state both feed the Master tab summaries and CSV export.

## Export

The CSV export includes:

- task ID
- opportunity ID
- task owner
- account
- account lead
- service
- service lead
- task type
- action text
- completion status
- notes
