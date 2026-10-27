# WindTurbine AI — Frontend Web Application

> **Smart Edge-Based Predictive Maintenance and Performance Optimization Framework for Wind Turbines Using Machine Learning**

A professional, industrial-grade React web application designed for monitoring wind turbine operations, identifying anomalies, assessing component health & risk indices, exploring explainable AI feature attributions, and tracking live ambient site telemetry.

---

## 🌬️ Visual & Design Philosophy

- **Premium Light Theme**: Designed with an ultra-clean industrial aesthetic. Dominant pure white (`#FFFFFF`) surfaces, slate backgrounds (`#F8FAFC`), subtle borders (`#E2E8F0`), and restrained energy-blue accents (`#0EA5E9`).
- **Data Integrity**: **Zero fake mock data**. Every KPI, power curve, health score, and anomaly alert is fetched directly from the FastAPI backend.
- **Micro-Interactions**: Smooth 150–250ms transitions, clean loading skeletons, and interactive Recharts data visualizations.
- **Responsive Layout**: Desktop fixed navigation sidebar (250px), tablet collapsible rail, and mobile overlay drawer.

---

## 🚀 Technology Stack

- **Framework**: React 18+ (Pure JavaScript, no TypeScript)
- **Tooling**: Vite (Lightning-fast HMR and bundling)
- **Styling**: Tailwind CSS & PostCSS
- **Routing**: React Router v6
- **HTTP Client**: Axios with JWT interceptors
- **Visualizations**: Recharts (Power curves, health timelines, risk donuts, feature importances)
- **Icons**: Lucide React

---

## 📁 Project Structure

```
frontend/
├── public/
│   ├── logo.svg              # Wind turbine branding SVG
│   └── favicon.svg           # Application favicon
├── src/
│   ├── app/
│   │   ├── App.jsx           # Application root wrapper (Auth, Toast, ErrorBoundary)
│   │   ├── routes.jsx        # Public and protected route configurations
│   │   └── styles.css        # Global CSS & Tailwind directives
│   ├── components/
│   │   ├── common/           # Button, Modal, Skeleton, Badges, ErrorBoundary
│   │   ├── layout/           # Sidebar, Header, ProtectedLayout, UserMenu
│   │   ├── dashboard/        # KpiCard, RiskDistribution, PowerCurveChart, Tables
│   │   ├── datasets/         # UploadCard, CompatibilityBadge, QualityIndicator
│   │   ├── inference/        # AnalysisProgress, AnalysisStatus, PredictionTable
│   │   ├── health/           # CircularGauge, ComponentBreakdown
│   │   ├── performance/      # SingleInferencePanel
│   │   ├── explainability/   # FeatureImportanceChart
│   │   └── weather/          # WeatherWidget
│   ├── context/
│   │   ├── AuthContext.jsx   # JWT state, login, signup, user persistence
│   │   └── ToastContext.jsx  # Notification manager
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useDashboard.js
│   │   ├── useDatasets.js
│   │   └── useInference.js
│   ├── lib/
│   │   ├── api.js            # Axios client with interceptors
│   │   └── constants.js      # Status colors and farm components
│   ├── pages/
│   │   ├── Home.jsx          # Public landing page
│   │   ├── Login.jsx         # Sign in
│   │   ├── Signup.jsx        # Registration
│   │   ├── Dashboard.jsx     # Fleet summary KPIs, risk charts, quick alerts
│   │   ├── Upload.jsx        # Dataset upload & compatibility check
│   │   ├── Datasets.jsx      # Historical dataset catalog
│   │   ├── DatasetDetails.jsx# Quality metrics, column schemas, statistics
│   │   ├── Fleet.jsx         # Searchable, filterable turbine overview
│   │   ├── TurbineDetails.jsx# Individual asset health, power curve, degradation
│   │   ├── Performance.jsx   # Power performance & single diagnostic inference
│   │   ├── Alerts.jsx        # Severity filtering & alert acknowledgment
│   │   ├── HealthRisk.jsx    # Dual gauges & component degradation inspection
│   │   ├── Explainability.jsx# Global & local SHAP/feature importance insights
│   │   └── LiveWind.jsx      # Meteorological site weather monitoring
│   ├── services/             # Dedicated API services for each domain
│   ├── utils/                # Number/Date/Power formatters and chart helpers
│   └── main.jsx              # React DOM mounting
├── .env                      # Environment config (VITE_API_URL)
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## ⚙️ Configuration & Environment

Create a `.env` file in the `frontend` root:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

---

## 🏃 Running the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The application will launch at: `http://localhost:5173`

### 3. Production Build
```bash
npm run build
```
Build output is generated cleanly in `dist/`.

---

## 🔐 Authentication & API Integration

- **Backend Base URL**: `http://127.0.0.1:8000`
- **Protected Routes**: All administrative & monitoring routes verify JWT tokens via `GET /api/auth/me`.
- **Automatic Refresh & Interception**: 401 Unauthorized responses trigger automatic session termination and clean redirection to `/login`.
