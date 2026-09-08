# Calcify_Suite ⚡

**Calcify_Suite** is an enterprise sales tracking, performance monitoring, and salary calculation platform styled with PhonePe-inspired white and violet aesthetics. It enables sales representatives to submit daily activity forms without login, tracks individual and team performance, calculates Economic Value Added (EVA) scores, and automates salary/incentive payouts.

---

## 🌟 Key Features

1. **No-Login Public Activity Submission Form**:
   - Fields: Date of Sale, **ACE Number** (10 digits), Merchant ID, Store ID, CBS Name.
   - Dynamic **Activity** selection:
     - **SO (Sales Order)**: 3499, Preferred Base, Untagged Base.
     - **Premium Acquisition**: Individual, Non-Individual.
     - **Successfull REKYC**: Individual, Non-Individual (Valid by default).
   - Real-time duplicate Merchant ID + Store ID alert within the same activity.
   - Immediate prompt to submit another response upon completion.

2. **User Portal (Sales Agents)**:
   - Registration with 10-digit **ACE Number**, Name, Cluster Manager selection (7 standard CMs), and 4-digit PIN.
   - Login with ACE Number + 4-digit PIN.
   - Access to submissions matching user's ACE Number.
   - Master Analysis Grid: **Valid (Yes/No)** and **TPV (₹)** directly editable by the agent.
   - Rank Among All Agents badge (with total Gross EVA and orders).
   - Day-wise and Month-wise date filtering.
   - Ability to delete own submitted forms with caution confirmation prompt.

3. **Cluster Manager (CM / CL) Portal**:
   - Registration with official `@phonepe.com` email (quota: max 20).
   - Scoped to view agents and activities within assigned cluster.
   - Ability to filter by agent, activity, and date (Day / Month wise).
   - Inline toggle for **Valid** and **TPV** editing.
   - Action column with **Trash** icon to delete filled forms within their cluster.
   - Authority to remove registered agents under their cluster.

4. **Zonal Head (ZH) Portal**:
   - Registration with official `@phonepe.com` email (quota: max 2).
   - **MASTER DATA** grid across all clusters with organizational metric cards: Total submissions, Total SO, Total PA, Total TPV, Total SO Valid.
   - Ability to edit/add Form Questions and adjust base EVA Rate (default **₹82/EVA**).
   - Action column to delete any filled form submission across the organization.
   - Roster Management: Authority to remove registered Users and Cluster Managers.
   - 1-Click **Excel Report Export** (`.xlsx`).
   - **Bulk Activity Upload** (Excel & CSV) with standard template downloads.

5. **Secret Developer Control Center**:
   - Secret master login via ZH portal with `calcify.sales@gmail.com` and `Phonepe@2026`.
   - **100% Code-Free Visual Interface**:
     - Visual Platform Rates & EVA Points editor with 1-click save.
     - Form Submissions Manager with individual delete buttons and a global **Clear All Submissions** reset button.
     - User Roster Manager with 1-click user removal.
     - 1-Click Sample Activity Batch Injector (5, 15, 30, 50 records).
     - Live View Impersonation Switcher (preview app as ZH, any CM, or any Sales User).
     - AI Intelligence Executive Summaries.

6. **Branding & Footer**:
   - Centered 2-line official footer:
     - `Created By- Premium Sales (Hyderabad Team)`
     - `mail:- calcify.sales@gmail.com`

---

## 🛠️ Quick Local Setup

```bash
# 1. Clone the repository
git clone <YOUR-REPO-URL>
cd calcify-suite

# 2. Install all dependencies and build frontend
npm run install:all
npm run build

# 3. Start the unified server
npm start
```

Open **[http://localhost:5050](http://localhost:5050)** in your browser.

---

## 🚀 100% GitHub-Only Deployment (GitHub Pages)

**Calcify_Suite** is configured to run completely and natively inside **GitHub** via **GitHub Pages & GitHub Actions**, requiring **NO external platforms or third-party servers** (no Render.com, no Heroku, no cloud databases).

### How to Activate Live Site in GitHub:
1. Push your repository to GitHub (or double-click `Upload-To-GitHub.bat` on your Desktop).
2. Open your repository on GitHub: `https://github.com/calcifysales/calcify-suite`.
3. Click **Settings** (tab at the top) -> Click **Pages** (in the left sidebar).
4. Under **Build and deployment**:
   - For **Source**, select: **GitHub Actions**.
5. That's it! GitHub Actions will automatically build and publish your site.
6. Your permanent live link is:
   👉 **`https://calcifysales.github.io/eva-tracker/`**

---

## 💻 Local Development

```bash
# 1. Clone the repository
git clone https://github.com/calcifysales/calcify-suite.git
cd calcify-suite

# 2. Install dependencies & run development server
npm run dev
```

Open `http://localhost:5173` to run locally.

---

## 🔒 Default Security & Credentials

| Role | Access Method | Credentials |
| :--- | :--- | :--- |
| **Sales User** | Self-Registration with ACE Number | 10-digit ACE + 4-digit PIN |
| **Cluster Manager** | Registration | `@phonepe.com` email (max 20 quota) |
| **Zonal Head** | Registration | `@phonepe.com` email (max 2 quota) |
| **Secret Developer** | ZH Login Screen | `calcify.sales@gmail.com` / `Phonepe@2026` |
