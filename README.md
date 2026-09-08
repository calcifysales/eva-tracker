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

## 🚀 How to Deploy to GitHub (Zero Errors)

### Step 1: Create a New Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Name your repository (e.g. `calcify-suite`).
3. Set visibility to **Public** or **Private**.
4. **Do not** initialize with README, .gitignore, or license (we already have them configured).
5. Click **Create repository**.

### Step 2: Push Your Code to GitHub
Run the following commands in your terminal:

```bash
# Link your local repository to GitHub (replace <YOUR_USERNAME> and <REPO_NAME>)
git remote add origin https://github.com/<YOUR_USERNAME>/calcify-suite.git

# Push the main branch to GitHub
git push -u origin main
```

---

## 🌐 How to Deploy the Live Site Online (Free Full-Stack Hosting)

Because **Calcify_Suite** is a full-stack platform with a Node.js Express backend and persistent JSON storage, it requires a Node runtime to process logins, PINs, form submissions, and Excel exports.

### Recommended: Deploy on [Render.com](https://render.com) (100% Free)

1. Sign up or log in to [Render.com](https://render.com) with your GitHub account.
2. Click **New +** -> **Web Service**.
3. Select your GitHub repository (`calcify-suite`).
4. Configure the settings:
   - **Name**: `calcify-suite` (or your chosen name)
   - **Environment**: `Node`
   - **Region**: Any close region (e.g. Singapore / Frankfurt / Oregon)
   - **Branch**: `main`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Click **Deploy Web Service**.
6. Render will automatically build the client and launch the server. Within 2 minutes, you will have a live public HTTPS URL (e.g., `https://calcify-suite.onrender.com`) that works on both mobile and desktop!

---

## 🔒 Default Security & Credentials

| Role | Access Method | Credentials |
| :--- | :--- | :--- |
| **Sales User** | Self-Registration with ACE Number | 10-digit ACE + 4-digit PIN |
| **Cluster Manager** | Registration | `@phonepe.com` email (max 20 quota) |
| **Zonal Head** | Registration | `@phonepe.com` email (max 2 quota) |
| **Secret Developer** | ZH Login Screen | `calcify.sales@gmail.com` / `Phonepe@2026` |
