# Smart Hospital & Healthcare Management Platform

An AI-powered, full-stack hospital management system designed to streamline operations, provide generative AI capabilities, and monitor sustainability metrics.

## Features

- **Role-Based Access**: Specialized portals for Patients, Doctors, Pharmacists, Receptionists, and Admins.
- **Generative AI Integration**: Powered by local **Ollama (llama3)** for summarizing medical reports, explaining health risks, providing financial budget analysis, and an AI Chatbot assistant.
- **FastAPI Backend**: High-performance backend utilizing SQLAlchemy, SQLite, and JWT Authentication.
- **Glassmorphism Frontend**: Modern, responsive UI built with HTML, Vanilla CSS, and JavaScript.
- **Sustainability Dashboard**: Track carbon footprint, energy consumption, and medical waste management.

---

## Prerequisites

- [Python 3.8+](https://www.python.org/downloads/)
- [Docker & Docker Compose](https://www.docker.com/) (Optional, but recommended)
- [Ollama](https://ollama.com/) (For local generative AI features)

---

## Setup Instructions

### 1. Start Local AI Engine (Ollama)
The application relies on `llama3` for its AI features. Ensure Ollama is running before starting the backend.
```bash
ollama run llama3
```

### 2. Run the Application

You can run the application either via Docker or manually.

#### Option A: Using Docker (Recommended)
This will build and start both the frontend and backend together.
```bash
docker-compose up --build
```
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000

#### Option B: Running Manually
If you prefer not to use Docker, run the frontend and backend in separate terminals:

**Backend Setup:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app
```
*(The backend runs on http://localhost:8000)*

**Frontend Setup:**
```bash
cd frontend
python -m http.server 8080
```
*(The frontend runs on http://localhost:8080)*

---

## Demo Users

The database automatically seeds demo data on its first run. You can log in using the following test accounts (Password for all: `password123`):
- `patient@demo.com`
- `doctor@demo.com`
- `pharmacist@demo.com`
- `receptionist@demo.com`
- `admin@demo.com`

---

## Project Structure

```text
📁 backend/       # FastAPI application, database, and AI service integration
📁 frontend/      # Static assets (HTML, CSS, JS) and UI components
📄 docker-compose.yml # Docker configuration for full-stack deployment
📄 .gitignore     # Git ignore rules for Python, DB, and uploads
```
