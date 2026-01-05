# JobConnect - ATS (Applicant Tracking System) Platform

A modern recruitment platform with Angular frontend, .NET backend, PostgreSQL database, and Docker containerization.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- .NET 10 SDK (for local development)

### Run with Docker

```bash
# Clone and start
cd JobConnect
docker-compose up --build
```

**Services:**

- **Frontend:** <http://localhost:4200>
- **API:** <http://localhost:5000>
- **Database:** localhost:5432

### Local Development

**Backend:**

```bash
cd JobConnect.API/JobConnect.API
dotnet run
```

**Frontend:**

```bash
cd jobconnect-frontend
npm install
npm start
```

## ✨ Features

### Candidate Features

- **CV Builder** - Dynamic profile builder with real-time preview
- **Application Tracker** - Visual status pipeline (Submitted → Screening → Interview → Offer → Hired)
- **Skills Management** - Link skills to your profile for better matching

### Company Features  

- **Kanban Board** - Drag & drop candidates between stages
- **Matching Score** - Algorithm calculates skill match percentage
- **Job Management** - Create, publish, and manage job postings

## 🏗️ Architecture

```
JobConnect/
├── docker-compose.yml
├── JobConnect.API/           # .NET Web API
│   └── JobConnect.API/
│       ├── Controllers/      # API endpoints
│       ├── Models/           # Entity Framework models
│       ├── Services/         # Business logic
│       └── DTOs/             # Data transfer objects
└── jobconnect-frontend/      # Angular 19
    └── src/app/
        ├── core/             # Services, guards, interceptors
        └── features/         # CV Builder, Kanban, etc.
```

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 19, Angular CDK (DragDrop), SCSS |
| Backend | .NET 10, Entity Framework Core |
| Database | PostgreSQL 16 |
| Auth | JWT with BCrypt |
| Container | Docker, Docker Compose |

## 📊 Matching Score Algorithm

```
Score = (Matched Required Skills / Total Required Skills) × 70
      + (Matched Optional Skills / Total Optional Skills) × 20  
      + Proficiency Bonus (up to 10)
      
Max Score: 100%
```

## 🔒 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/jobs` | List published jobs |
| POST | `/api/applications` | Apply to job |
| PUT | `/api/candidates/profile` | Update CV |
| GET | `/api/companies/jobs/{id}/applications` | Get job applicants |

## 📝 License

MIT
