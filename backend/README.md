# Wind Turbine AI - Edge Predictive Maintenance & Performance Optimization Backend

**Project Title:** Smart Edge-Based Predictive Maintenance and Performance Optimization Framework for Wind Turbines Using Machine Learning

---

## 1. Backend Architecture

The backend serves as a production-grade inference, telemetry, diagnostics, and fleet management API built on **FastAPI**, **MongoDB**, **PyTorch**, **XGBoost**, and **Scikit-Learn**. It loads existing trained machine learning artifacts into memory once at startup and evaluates operational performance degradation, autoencoder reconstruction errors, and isolation forest density anomalies.

```
Frontend / Client
      │
      ▼
FastAPI Application Layer (CORS, Lifespan, Auth Guards, Error Handling)
      │
      ├─► /api/auth              (JWT Authentication & User Management)
      ├─► /api/datasets          (CSV Upload, Exploration, Quality, Compatibility)
      ├─► /api/inference         (Single sample & Async Batch Diagnostics)
      ├─► /api/dashboard         (Fleet-level health, risk distribution, alerts)
      ├─► /api/turbines          (Turbine status, operational indicators, history)
      ├─► /api/alerts            (Diagnostic anomaly & priority alerts)
      ├─► /api/explainability    (Feature importances & local explanations)
      └─► /api/weather           (Live external meteorological telemetry)
      │
      ▼
Application Service Layer
      │
      ▼
ML Edge Adapter Layer (`EdgeAdapter` & `ModelManager`)
      │
      ▼
Trained Model Artifacts (Loaded Once at Startup - NEVER Retrained)
  ├── Wind Farm A: XGBoost Regressor + Scaler + PyTorch Autoencoder + Isolation Forest + Anomaly Scaler
  ├── Wind Farm B: XGBoost Regressor + Scaler + PyTorch Autoencoder + Isolation Forest + Anomaly Scaler
  └── Health Fusion Layer: Normalized diagnostic fusion, component mapping, and operational risk scoring
      │
      ▼
Result Adapter (`sanitize_record` / `sanitize_value`)
      │
      ▼
MongoDB (Local / Atlas) + Storage Filesystem (`storage/analysis_results/`)
```

---

## 2. Requirements

- **Operating System:** Windows 10/11, Linux, or macOS
- **Python:** 3.10 to 3.12 (Validated on Python 3.12.2)
- **Database:** MongoDB 6.0+ (Local community service or MongoDB Atlas cluster)
- **C++ Build Tools:** Not required (pre-built wheels used for XGBoost, PyTorch, and Scikit-Learn)

---

## 3. Python Version

- Recommended: **Python 3.12.x** or **3.11.x**
- Verify version:
  ```powershell
  python --version
  ```

---

## 4. Virtual Environment Setup

From the `backend/` directory:

```powershell
# Create virtual environment
python -m venv .venv

# Activate on Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Activate on Windows Command Prompt (cmd)
.\.venv\Scripts\activate.bat

# Activate on Linux / macOS
source .venv/bin/activate
```

---

## 5. Dependency Installation

With your virtual environment activated, install all required packages:

```powershell
pip install -r requirements.txt
```

Key libraries installed:
- `fastapi`, `uvicorn`: ASGI web framework and server
- `motor`, `pymongo`: Async and sync MongoDB drivers
- `pydantic`, `pydantic-settings`: Schema validation and settings management
- `bcrypt`, `python-jose`: Password hashing and JWT token issuance
- `pandas`, `numpy`: Tabular telemetry manipulation and statistical exploration
- `torch`: PyTorch runtime for running the Autoencoder neural networks
- `xgboost`, `scikit-learn`, `joblib`: Performance regression and Isolation Forest scoring

---

## 6. MongoDB Local Setup

The backend defaults to a local MongoDB instance.

1. Install [MongoDB Community Server](https://www.mongodb.com/try/download/community).
2. Start the Windows MongoDB service:
   ```powershell
   Get-Service -Name MongoDB
   Start-Service -Name MongoDB
   ```
3. Connect using connection string:
   ```env
   MONGO_URI=mongodb://localhost:27017
   MONGO_DB_NAME=wind_turbine_ai
   ```
4. **Transition to MongoDB Atlas:**
   To deploy to MongoDB Atlas, simply replace `MONGO_URI` in `.env`:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
   ```
   *No application code changes are required.*

---

## 7. Environment Configuration (`.env`)

Copy `.env.example` to `.env` in the `backend/` root:

```powershell
Copy-Item .env.example .env
```

Configuration variables:

| Variable | Default Value | Description |
|---|---|---|
| `APP_NAME` | `Wind Turbine AI Backend` | Application display name |
| `APP_ENV` | `development` | Environment mode (`development`/`production`) |
| `HOST` | `127.0.0.1` | Host interface to bind |
| `PORT` | `8000` | Port to bind |
| `MONGO_URI` | `mongodb://localhost:27017` | Local MongoDB or Atlas connection URI |
| `MONGO_DB_NAME` | `wind_turbine_ai` | Target MongoDB database name |
| `JWT_SECRET_KEY` | `CHANGE_THIS_SECRET...` | Secret key for signing JWT tokens |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `JWT_EXPIRE_MINUTES`| `60` | Token expiration time in minutes |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed frontend origins |
| `WEATHER_API_BASE_URL` | `https://api.open-meteo.com/v1/forecast` | Meteorological endpoint |
| `UPLOAD_DIR` | `storage/uploads` | Path for raw uploaded CSV files |
| `PROCESSED_DIR` | `storage/processed` | Path for intermediate processed data |
| `ANALYSIS_RESULTS_DIR` | `storage/analysis_results`| Path for analysis prediction result dumps |
| `MODEL_ROOT` | `../trained_models` | Path to trained ML model directory |

---

## 8. How Model Paths Work

The backend resolves model files relative to the project directory:

```
project wind/
├── trained_models/
│   ├── feature_config.json
│   ├── anomaly/
│   │   ├── farm_a_autoencoder.pt
│   │   ├── farm_a_autoencoder.json
│   │   ├── farm_a_isolation_forest.joblib
│   │   ├── scaler_farm_a_anomaly.joblib
│   │   ├── farm_b_autoencoder.pt
│   │   ├── farm_b_autoencoder.json
│   │   ├── farm_b_isolation_forest.joblib
│   │   └── scaler_farm_b_anomaly.joblib
│   ├── health/
│   │   └── health_fusion_config.json
│   └── performance/
│       ├── farm_a_xgboost.joblib
│       ├── farm_b_xgboost.joblib
│       ├── model_metadata.json
│       ├── scaler_farm_a_perf.joblib
│       └── scaler_farm_b_perf.joblib
└── backend/
    └── app/config/paths.py (Resolves MODEL_ROOT to PROJECT_ROOT / "trained_models")
```

- In `app/config/paths.py`, `MODEL_ROOT` automatically checks both `BACKEND_ROOT / "../trained_models"` and `PROJECT_ROOT / "trained_models"`.
- As verified from `feature_config.json`, the active scalers are `scaler_farm_a_anomaly.joblib` and `scaler_farm_b_anomaly.joblib` (not the unreferenced `_v2` scalers).
- At startup, `validate_required_artifacts()` verifies all 15 model files. If any required file is missing, the backend fails immediately with a descriptive error.

---

## 9. How to Start FastAPI

Run the development server using Uvicorn:

```powershell
# From the backend directory
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## 10. Swagger Documentation URL

Interactive OpenAPI documentation:
- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Verification:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 11. Authentication Flow

1. **Sign Up:** `POST /api/auth/signup`
   - Request: `{"name": "Engineer", "email": "engineer@windfarm.com", "password": "SecurePassword123"}`
   - Passwords are salted and hashed using `bcrypt` (never stored in plaintext).
2. **Login:** `POST /api/auth/login`
   - Returns a signed JWT Bearer token:
     ```json
     {
       "access_token": "eyJhbGciOi...",
       "token_type": "bearer",
       "user": {"id": "...", "name": "Engineer", "email": "engineer@windfarm.com"}
     }
     ```
3. **Authenticated Calls:**
   - Include the header: `Authorization: Bearer <access_token>` in subsequent requests.
4. **Current User Profile:** `GET /api/auth/me`

---

## 12. Dataset Upload & Compatibility Flow

1. **Upload CSV:** `POST /api/datasets/upload` (multipart/form-data)
   - Stored safely with UUID names under `backend/storage/uploads/` to prevent path traversal.
   - Evaluates columns against `feature_config.json`.
2. **Inspect Metadata:**
   - `GET /api/datasets/{id}/summary`: Column types, missing values, duplicates, numeric statistics.
   - `GET /api/datasets/{id}/quality`: Data completeness, cell null rates.
   - `GET /api/datasets/{id}/compatibility`: Verifies whether all 41 features (Farm A) or 43 features (Farm B) are present.
3. **Incompatible Datasets:**
   - If an uploaded CSV is not a compatible SCADA dataset, it is flagged as `compatible: false`.
   - The ML inference pipeline refuses to execute incompatible data, preserving pipeline integrity while offering dataset exploration statistics.

---

## 13. ML Inference Flow

### Core Principle
**No models are trained or retrained by this backend.** All models loaded into memory at startup are the authoritative trained artifacts.

### Single-Sample Edge Inference (`POST /api/inference/single`)
- Receives SCADA features in JSON.
- **Power Curve Model (XGBoost):**
  $X_{scaled} = \text{perf\_scaler}(X_{perf})$
  $\text{expected\_power} = \text{XGBoost}(X_{scaled})$
  $\text{underperformance} = \max(0, \text{expected\_power} - \text{actual\_power})$
  $\text{perf\_deg} = \min(1.0, \text{underperformance} / \text{underperf\_p99})$
- **Reconstruction Anomaly (PyTorch Autoencoder):**
  $X_{anom\_scaled} = \text{anom\_scaler}(X_{anom})$
  $\hat{X} = \text{Autoencoder}(X_{anom\_scaled})$
  $\text{sample\_mse} = \text{mean}((X_{anom\_scaled} - \hat{X})^2)$
  $\text{ae\_score} = \min(1.0, \text{sample\_mse} / \text{ae\_threshold\_p99})$
- **Isolation Forest Score:**
  $\text{if\_score} = \min(1.0, \max(0, (\text{if\_threshold} - \text{decision\_function}) / (\text{if\_threshold} - \text{if\_p01})))$
- **Component Degradation:**
  Calculates normalized mean squared reconstruction errors per component subsystem (Gearbox, Generator, Hydraulic, Transformer, Electrical Grid, Rotor Bearing) based on `health_fusion_config.json`.
- **Fusion Layer:**
  $$\text{raw\_degradation} = 0.35 \times \text{perf\_deg} + 0.35 \times \text{overall\_anomaly} + 0.30 \times \text{max\_comp\_deg}$$
  $$\text{health\_index} = 100.0 \times (1.0 - \text{raw\_degradation})$$
  $$\text{risk\_score} = 100.0 - \text{health\_index}$$
- **Operational Risk Priority:**
  - `LOW`: [0, 25)
  - `MEDIUM`: [25, 50)
  - `HIGH`: [50, 75)
  - `CRITICAL`: [75, 100]
  *(Note: Risk score represents operational maintenance priority, NOT a probability of failure).*

### Batch Inference (`POST /api/inference/batch`)
- Dispatches background job processing dataset CSV in mini-batches.
- Saves raw predictions to `storage/analysis_results/{analysis_id}.json`.
- Populates MongoDB `predictions`, `turbines`, and `alerts` (for HIGH/CRITICAL rows).
- Poll progress via `GET /api/inference/{analysis_id}/status`.
- Retrieve fleet summaries via `GET /api/inference/{analysis_id}/results`.

---

## 14. MongoDB Collection Structure

1. **`users`**
   - `_id`: ObjectId
   - `name`: string
   - `email`: string (indexed, unique)
   - `password_hash`: string (bcrypt)
   - `created_at`, `updated_at`: datetime

2. **`datasets`**
   - `_id`: ObjectId
   - `user_id`: ObjectId (indexed)
   - `filename`: string (safe UUID name)
   - `original_filename`: string
   - `file_path`: string
   - `file_size`, `rows`, `columns`: integer
   - `status`: string
   - `compatible`: boolean
   - `farm`: string ("A", "B", or null)
   - `created_at`, `updated_at`: datetime

3. **`analyses`**
   - `_id`: ObjectId
   - `user_id`: ObjectId (indexed)
   - `dataset_id`: ObjectId (indexed)
   - `farm`: string
   - `status`: string ("queued", "processing", "completed", "failed")
   - `model_version`: string
   - `total_rows`, `total_turbines`: integer
   - `average_health`, `average_risk`: float
   - `low_count`, `medium_count`, `high_count`, `critical_count`: integer
   - `results_file`: string
   - `started_at`, `completed_at`, `created_at`: datetime

4. **`predictions`**
   - `_id`: ObjectId
   - `analysis_id`: ObjectId (indexed)
   - `asset_id`: string (indexed)
   - `timestamp`: datetime (indexed)
   - `actual_power`, `expected_power`, `residual`: float
   - `anomaly_score`, `health_index`, `risk_score`: float
   - `risk_category`: string ("LOW", "MEDIUM", "HIGH", "CRITICAL")
   - `dominant_component`: string

5. **`alerts`**
   - `_id`: ObjectId
   - `analysis_id`: ObjectId (indexed)
   - `asset_id`: string (indexed)
   - `timestamp`: datetime
   - `severity`: string ("HIGH", "CRITICAL")
   - `risk_score`: float
   - `component`: string
   - `anomaly_score`: float
   - `message`: string
   - `acknowledged`: boolean
   - `created_at`: datetime

6. **`turbines`**
   - `_id`: ObjectId
   - `user_id`: ObjectId (indexed)
   - `turbine_id`: string (indexed)
   - `farm`: string
   - `name`: string
   - `latest_health`, `latest_risk`: float
   - `latest_risk_category`: string
   - `dominant_component`: string
   - `latest_prediction_timestamp`: datetime
   - `latitude`, `longitude`: optional float
   - `created_at`, `updated_at`: datetime

---

## 15. Complete API Endpoint List

### Health
- `GET /health` - Root health check
- `GET /api/health` - API health check

### Authentication (`/api/auth`)
- `POST /api/auth/signup` - Register user account
- `POST /api/auth/login` - Authenticate and acquire JWT
- `GET /api/auth/me` - Authenticated user profile

### Datasets (`/api/datasets`)
- `POST /api/datasets/upload` - Upload SCADA CSV
- `GET /api/datasets` - List user's datasets
- `GET /api/datasets/{id}` - Dataset details
- `GET /api/datasets/{id}/summary` - Column and statistical summary
- `GET /api/datasets/{id}/quality` - Data quality and completeness
- `GET /api/datasets/{id}/compatibility` - Check feature compatibility against trained models

### Inference (`/api/inference`)
- `POST /api/inference/single` - Instant edge single sample diagnostic
- `POST /api/inference/batch` - Queue asynchronous batch inference
- `GET /api/inference/{analysis_id}/status` - Check batch analysis progress
- `GET /api/inference/{analysis_id}/results` - Retrieve completed analysis summary

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard/summary` - Aggregate fleet overview and operational KPIs

### Turbines (`/api/turbines`)
- `GET /api/turbines` - List all turbines with latest health indices
- `GET /api/turbines/{id}` - Turbine detail
- `GET /api/turbines/{id}/history` - Historical prediction time series

### Alerts (`/api/alerts`)
- `GET /api/alerts` - List operational alerts (supports filters: `severity`, `asset_id`, `analysis_id`, `acknowledged`)
- `GET /api/alerts/{id}` - Alert detail
- `POST /api/alerts/{id}/acknowledge` - Acknowledge alert

### Explainability (`/api/explainability`)
- `GET /api/explainability/global` - Global feature importance from models / SHAP assets
- `GET /api/explainability/{asset_id}` - Local event explainability plots

### Weather (`/api/weather`)
- `GET /api/weather/current` - Live meteorological observations for situational display

---

## 16. Troubleshooting

1. **`CRITICAL: Model root directory not found`**:
   - Verify `MODEL_ROOT` in `.env`. By default it expects `../trained_models`.
   - Ensure the `trained_models` directory exists alongside `backend`.

2. **MongoDB Connection Refused (`127.0.0.1:27017`)**:
   - Check if the local MongoDB service is running:
     ```powershell
     Get-Service -Name MongoDB
     Start-Service -Name MongoDB
     ```
   - If using MongoDB Atlas, check your network whitelist (IP Access List) in MongoDB Atlas.

3. **`Dataset is not compatible with trained wind turbine model`**:
   - Review `/api/datasets/{id}/compatibility`.
   - Check `missing_features` in the response to verify which SCADA sensor columns are absent from the uploaded CSV.

4. **Running Automated Tests**:
   - Run the full test suite with:
     ```powershell
     pytest -v
     ```
