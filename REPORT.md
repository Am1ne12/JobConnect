# JobConnect - ATS (Applicant Tracking System) Platform

## Technical Project Report

> Connecting Talent with Opportunity

| Aspect           | Details                              |
| ---------------- | ------------------------------------ |
| **Technologies** | Angular, .NET 9, PostgreSQL          |
| **Architecture** | Full-Stack with Docker               |
| **Deployment**   | Coolify / Docker Compose             |

---

## Table of Contents

- [Part I: Cahier de Charge](#part-i-cahier-de-charge)
  - [Introduction](#introduction)
  - [Functional Requirements](#functional-requirements)
  - [Non-Functional Requirements](#non-functional-requirements)
- [Part II: Conception](#part-ii-conception)
  - [Data Architecture](#data-architecture)
  - [Data Models](#data-models)
  - [Entity Relationships](#entity-relationships)
- [Part III: Technologies](#part-iii-technologies)
  - [Technology Selection Philosophy](#technology-selection-philosophy)
  - [Frontend Technologies](#frontend-technologies)
  - [Backend Technologies](#backend-technologies)
- [Part IV: Application](#part-iv-application)
  - [REST API](#rest-api)
  - [Matching Score Algorithm](#matching-score-algorithm)
  - [Deployment](#deployment)
  - [Screenshots](#screenshots)
  - [Installation](#installation)
  - [Security Considerations](#security-considerations)
  - [Conclusion](#conclusion)

---

## Part I: Cahier de Charge

## Introduction

### Project Overview

**JobConnect** is a modern Applicant Tracking System (ATS) platform designed to streamline the recruitment process for both job seekers and employers. This full-stack web application enables candidates to build professional CVs, discover job opportunities, and track their applications, while companies can post job listings, manage applicants, and organize their hiring pipeline using an intuitive Kanban board.

The application is built with a modern architecture that clearly separates the frontend (Angular) from the backend (.NET), facilitating maintenance, scalability, and independent deployment of each component.

In today's competitive job market, efficient talent acquisition is crucial for organizational success. JobConnect addresses the need for a self-hosted, feature-rich ATS that provides intelligent candidate-job matching based on skills and proficiency levels.

### Project Objectives

- **Dual-User Experience**: Intuitive interfaces tailored for both candidates and companies
- **Smart Matching**: AI-powered skill matching algorithm with proficiency scoring
- **CV Builder**: Real-time CV builder with live preview and auto-save functionality
- **Pipeline Management**: Kanban-style applicant tracking for efficient hiring workflows
- **Modern Design**: Liquid glass SaaS aesthetic with responsive mobile support
- **Flexible Deployment**: Docker and Coolify support for easy self-hosting

### Target Audience

The JobConnect application is designed for:

- **Job Seekers** who need to create professional CVs and discover relevant opportunities
- **HR Professionals** requiring an efficient tool to manage recruitment pipelines
- **Small to Medium Enterprises** seeking a cost-effective, self-hosted ATS solution
- **Startups** looking for a modern, scalable hiring platform
- **Recruitment Agencies** needing to manage multiple job postings and candidates

---

## Functional Requirements

### Authentication System

**User Registration:**

- Users must be able to create an account with email and password
- Registration requires role selection: Candidate or Company
- Email addresses must be unique across the system
- Passwords are securely hashed using BCrypt algorithm

**User Login & Session Management:**

- JWT-based authentication (JSON Web Tokens) for stateless session management
- Token expiration is configurable (default: 60 minutes)
- Automatic redirection to login on token expiration
- Secure token storage in browser's local storage
- Role-based access control (Candidate vs Company)

### Candidate Features

| Feature | Description |
| --- | --- |
| 📝 CV Builder | Create professional CVs with real-time preview |
| 💼 Experience | Add work experience with company, title, dates, and description |
| 🎓 Education | Record educational background with degrees and institutions |
| 📜 Certifications | Track professional certifications with issue dates |
| 🛠️ Skills | Add skills with proficiency levels (Beginner to Expert) |
| 📊 Application Tracker | Visual pipeline showing application status across stages |
| 🔍 Job Search | Filter jobs by keywords, location, type, and required skills |
| ⭐ Match Score | See personalized matching scores for each job |

### Company Features

| Feature | Description |
| --- | --- |
| 📋 Job Posting | Create detailed job listings with requirements and skills |
| 👥 Candidate Management | View and manage applicants for each position |
| 📌 Kanban Board | Drag-and-drop pipeline management |
| 👤 Profile Viewing | Access candidate CVs with full details |
| ✅ Status Updates | Move candidates through hiring stages |
| 📊 Dashboard | Overview of active jobs and incoming applications |

### Application Pipeline

The application supports the following status stages:

1. **Submitted** - Initial application received
2. **Screening** - Resume review in progress
3. **Interview** - Candidate selected for interviews
4. **Assessment** - Technical or skill assessment phase
5. **Offer** - Job offer extended
6. **Hired** - Successfully hired
7. **Rejected** - Application declined

---

## Non-Functional Requirements

### Performance & Scalability

- Page load time should be under 3 seconds on standard connections
- API response time should be under 500ms for standard CRUD operations
- Matching algorithm calculates scores in under 100ms
- Architecture supports horizontal scaling through Docker containerization
- Stateless API design enables load balancing across multiple instances

### Security Requirements

- HTTPS required in production for encrypted data transmission
- Passwords hashed using BCrypt with secure salt rounds
- JWT tokens for stateless authentication with configurable expiration
- Input validation on all API endpoints using Data Annotations
- CORS configuration to prevent unauthorized cross-origin access
- Role-based authorization (Candidate vs Company endpoints)

---

## Part II: Conception

## Data Architecture

### System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                         Coolify                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │   Frontend  │───▶│   Backend   │───▶│  PostgreSQL │      │
│  │  (Angular)  │    │   (.NET 9)  │    │  (Database) │      │
│  │   :80       │    │   :5000     │    │   :5432     │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│        │                                                    │
│        ▼                                                    │
│   https://jobconnect.yourdomain.com                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```text
┌─────────────────┐       HTTP/JSON       ┌─────────────────┐
│   Angular SPA   │ ─────────────────────▶│  .NET Web API   │
│    (Client)     │                       │   (Server)      │
└────────┬────────┘                       └────────┬────────┘
         │                                         │
         │  ConfigService                          │  Entity Framework
         │  loads config.json                      │  Core + Npgsql
         ▼                                         ▼
┌─────────────────┐                       ┌─────────────────┐
│  Runtime Config │                       │   PostgreSQL    │
│  (API_URL env)  │                       │   (Database)    │
└─────────────────┘                       └─────────────────┘
```

---

## Data Models

### User Model

The User model stores authentication and role information:

```csharp
public class User
{
    public int Id { get; set; }
    
    [Required, EmailAddress]
    public string Email { get; set; }
    
    [Required]
    public string PasswordHash { get; set; }
    
    [Required]
    public UserRole Role { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public CandidateProfile? CandidateProfile { get; set; }
    public Company? Company { get; set; }
}

public enum UserRole
{
    Candidate,
    Company
}
```

### CandidateProfile Model

The CandidateProfile stores candidate information with JSONB for flexible CV data:

```csharp
public class CandidateProfile
{
    public int Id { get; set; }
    public int UserId { get; set; }
    
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    public string? Location { get; set; }
    public string? Summary { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? GitHubUrl { get; set; }
    public string? PortfolioUrl { get; set; }
    
    // JSONB columns for flexible data storage
    [Column(TypeName = "jsonb")]
    public string? ExperienceJson { get; set; }
    
    [Column(TypeName = "jsonb")]
    public string? EducationJson { get; set; }
    
    [Column(TypeName = "jsonb")]
    public string? CertificationsJson { get; set; }
    
    // Navigation properties
    public User User { get; set; }
    public ICollection<CandidateSkill> Skills { get; set; }
    public ICollection<Application> Applications { get; set; }
}
```

### JobPosting Model

The JobPosting model represents job listings:

```csharp
public class JobPosting
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    
    [Required, MaxLength(200)]
    public string Title { get; set; }
    
    public string Description { get; set; }
    public string? Requirements { get; set; }
    public string? Location { get; set; }
    public string? Type { get; set; }  // Full-time, Part-time, Contract
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    
    public JobStatus Status { get; set; } = JobStatus.Draft;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public Company Company { get; set; }
    public ICollection<JobSkill> RequiredSkills { get; set; }
    public ICollection<Application> Applications { get; set; }
}
```

### Application Model

The Application model tracks job applications with Kanban support:

```csharp
public class Application
{
    public int Id { get; set; }
    public int CandidateProfileId { get; set; }
    public int JobPostingId { get; set; }
    
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Submitted;
    public int MatchingScore { get; set; }
    public int KanbanOrder { get; set; }
    public string? CoverLetter { get; set; }
    public string? Notes { get; set; }
    
    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation properties
    public CandidateProfile CandidateProfile { get; set; }
    public JobPosting JobPosting { get; set; }
}
```

---

## Entity Relationships

```text
┌─────────────┐         ┌─────────────────────┐         ┌─────────────┐
│    User     │────────▶│  CandidateProfile   │◀────────│ Application │
│             │         │                     │         │             │
│  - Email    │         │  - FirstName        │         │  - Status   │
│  - Password │         │  - Experience       │         │  - Score    │
│  - Role     │         │  - Education        │         │  - Notes    │
└─────────────┘         │  - Skills           │         └──────┬──────┘
       │                └─────────────────────┘                │
       │                                                       │
       │                ┌─────────────────────┐                │
       └───────────────▶│      Company        │                │
                        │                     │                │
                        │  - Name             │                │
                        │  - Description      │                │
                        │  - Website          │                │
                        └─────────┬───────────┘                │
                                  │                            │
                                  ▼                            │
                        ┌─────────────────────┐                │
                        │    JobPosting       │◀───────────────┘
                        │                     │
                        │  - Title            │
                        │  - Description      │
                        │  - RequiredSkills   │
                        └─────────────────────┘
```

### Skill Proficiency System

```text
┌─────────────────┐              ┌─────────────────┐
│     Skill       │              │  CandidateSkill │
│                 │◀─────────────│                 │
│  - Name         │              │  - SkillId      │
│  - Category     │              │  - Proficiency  │
└────────┬────────┘              │  - YearsExp     │
         │                       └─────────────────┘
         │
         ▼
┌─────────────────┐
│    JobSkill     │
│                 │
│  - SkillId      │
│  - IsRequired   │
│  - MinLevel     │
└─────────────────┘
```

---

## Part III: Technologies

## Technology Selection Philosophy

When selecting technologies for JobConnect, we followed these principles:

- **Modern & Maintained**: Choose actively maintained technologies with strong community support
- **Enterprise Ready**: Select technologies proven in production environments
- **Developer Experience**: Prioritize tools that enhance productivity and debugging
- **Type Safety**: Prefer strongly-typed languages for maintainability
- **Performance**: Select efficient solutions that scale well

---

## Frontend Technologies

### Angular (v21)

**What it is:** Angular is a platform and framework for building single-page client applications using HTML and TypeScript. Developed and maintained by Google.

**Why we chose it:**

- **Complete Framework**: Provides routing, forms, HTTP client, and more out of the box
- **TypeScript Native**: Built with TypeScript for excellent type safety
- **Signals**: Modern reactive primitives for efficient state management
- **Component Architecture**: Modular, reusable component design
- **CLI Tooling**: Powerful CLI for scaffolding and building
- **Enterprise Adoption**: Widely used in large-scale applications

### Angular Signals

**What it is:** Signals are Angular's new reactive primitive for managing state and triggering re-renders efficiently.

**Why we chose it over RxJS for simple state:**

- **Simpler Mental Model**: No need for subscriptions or memory leak concerns
- **Fine-Grained Reactivity**: Only affected components re-render
- **Computed Values**: Derived state automatically recalculates
- **Effect System**: Side effects that react to state changes

### SCSS (Sass)

**What it is:** SCSS is a preprocessor scripting language that extends CSS with variables, nesting, mixins, and more.

**Why we chose it over plain CSS or Tailwind:**

- **Variables & Theming**: Consistent design system with CSS custom properties
- **Nesting**: Cleaner, more organized stylesheets
- **Mixins**: Reusable style patterns
- **Partials**: Modular CSS organization
- **Full Control**: Custom designs without framework constraints

### RxJS

**What it is:** RxJS is a library for reactive programming using Observables, making it easier to compose asynchronous or callback-based code.

**Why we use it:**

- **HTTP Requests**: Angular's HttpClient returns Observables
- **Complex Async**: Debouncing, throttling, and combining streams
- **Operators**: Rich set of transformation operators
- **Angular Integration**: Native support in Angular ecosystem

---

## Backend Technologies

### .NET 9

**What it is:** .NET is a free, cross-platform, open-source developer platform for building many different types of applications.

**Why we chose it:**

- **Performance**: One of the fastest web frameworks available
- **C# Language**: Modern, type-safe language with excellent tooling
- **Entity Framework Core**: Powerful ORM with LINQ support
- **Minimal APIs**: Clean, declarative endpoint definitions
- **Cross-Platform**: Runs on Windows, Linux, and macOS
- **Long-Term Support**: Microsoft's commitment to ongoing maintenance

### ASP.NET Core Web API

**What it is:** ASP.NET Core is a cross-platform framework for building modern, cloud-based web applications.

**Why we chose it:**

- **RESTful Design**: Built for API-first development
- **Middleware Pipeline**: Composable request processing
- **Dependency Injection**: Built-in IoC container
- **OpenAPI Support**: Automatic API documentation
- **Authentication**: JWT and identity providers support

### Entity Framework Core

**What it is:** Entity Framework Core is a modern object-database mapper for .NET that enables LINQ queries and change tracking.

**Why we chose it:**

- **Code-First**: Define models in C#, generate database schema
- **Migrations**: Version control for database schema changes
- **LINQ Queries**: Type-safe queries in C#
- **JSONB Support**: PostgreSQL JSON column support with Npgsql
- **Lazy/Eager Loading**: Flexible data loading strategies

### PostgreSQL (v16)

**What it is:** PostgreSQL is a powerful, open-source object-relational database system known for reliability and feature robustness.

**Why we chose it over SQL Server or MySQL:**

- **JSONB Support**: Native JSON storage for flexible data structures
- **Full-Text Search**: Built-in text search capabilities
- **Performance**: Excellent query optimization
- **Open Source**: No licensing costs
- **Extensions**: Rich ecosystem (PostGIS, TimescaleDB, etc.)

### JWT Authentication

**What it is:** JSON Web Tokens are an open standard (RFC 7519) for securely transmitting information between parties.

**Why we chose it:**

- **Stateless**: No server-side session storage required
- **Scalable**: Works seamlessly across multiple server instances
- **Self-Contained**: Token contains all necessary claims
- **Cross-Domain**: Works with CORS and different client types
- **Mobile-Friendly**: No cookies required

---

## Frontend Stack Summary

| Technology | Role | Version |
| --- | --- | --- |
| Angular | Component-based SPA framework | 21 |
| TypeScript | Type-safe JavaScript superset | 5.7 |
| SCSS | CSS preprocessor with variables | - |
| RxJS | Reactive programming library | 7.8 |
| Angular CLI | Development tooling | 21 |
| Zone.js | Change detection | 0.15 |

## Backend Stack Summary

| Technology | Role | Version |
| --- | --- | --- |
| .NET | Runtime and SDK | 9.0 |
| ASP.NET Core | Web API framework | 9.0 |
| Entity Framework Core | ORM with migrations | 9.0 |
| PostgreSQL | Relational database | 16 |
| Npgsql | PostgreSQL .NET driver | Latest |
| BCrypt.Net | Password hashing | Latest |
| System.IdentityModel.Tokens.Jwt | JWT handling | Latest |

---

## DevOps & Deployment Technologies

### Docker

**What it is:** Docker is a platform for developing, shipping, and running applications inside lightweight, portable containers.

**Why we chose it:**

- **Environment Consistency**: Same container runs identically everywhere
- **Isolation**: Services run independently with isolated dependencies
- **Portability**: Deploy anywhere Docker is installed
- **Multi-Stage Builds**: Optimized production images
- **Health Checks**: Container readiness validation

### Docker Compose

**What it is:** Docker Compose is a tool for defining and running multi-container Docker applications.

**Why we chose it:**

- **Single Command Deployment**: Start entire stack with `docker-compose up`
- **Service Orchestration**: Define dependencies between services
- **Networking**: Internal service communication
- **Volume Management**: Persistent data storage
- **Environment Configuration**: Centralized configuration

### Coolify

**What it is:** Coolify is an open-source, self-hostable Platform-as-a-Service (PaaS) alternative to Heroku.

**Why we chose it:**

- **Self-Hosted**: Full control over infrastructure
- **Git Integration**: Automatic deployments on push
- **SSL Certificates**: Automatic Let's Encrypt provisioning
- **Docker Native**: Seamless Docker support
- **Environment Variables**: Secure secret management

---

## Project Structure

```text
JobConnect/
├── JobConnect.API/           # .NET Backend
│   ├── Controllers/         # API endpoints
│   ├── Data/               # DbContext and configurations
│   ├── Models/             # Entity models
│   ├── Services/           # Business logic
│   ├── DTOs/               # Data transfer objects
│   ├── Program.cs          # Application entry point
│   ├── Dockerfile          # Backend container
│   └── appsettings.json    # Configuration
│
├── jobconnect-frontend/     # Angular Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/       # Services, guards, interceptors
│   │   │   ├── features/   # Feature modules
│   │   │   ├── shared/     # Shared components
│   │   │   ├── app.routes.ts
│   │   │   └── app.config.ts
│   │   ├── assets/         # Static assets
│   │   ├── environments/   # Environment configs
│   │   └── styles.scss     # Global styles
│   ├── Dockerfile          # Dev container
│   ├── Dockerfile.prod     # Production container
│   └── nginx.conf          # Production server config
│
├── docker-compose.yml       # Container orchestration
├── README.md               # Project documentation
└── COOLIFY_DEPLOYMENT.md   # Deployment guide
```

---

## Part IV: Application

## REST API

The API follows RESTful conventions with consistent URL patterns and HTTP methods.

### Authentication Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | /api/auth/register | Create new user account |
| POST | /api/auth/login | Authenticate and receive JWT |
| PUT | /api/auth/change-email | Update email (protected) |
| PUT | /api/auth/change-password | Update password (protected) |

### Job Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /api/jobs | List jobs with filters |
| GET | /api/jobs/:id | Get job details |
| POST | /api/jobs | Create job posting (Company) |
| PUT | /api/jobs/:id | Update job (Company) |
| DELETE | /api/jobs/:id | Delete job (Company) |
| POST | /api/jobs/:id/publish | Publish draft job |
| POST | /api/jobs/:id/close | Close job posting |

### Candidate Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /api/candidates/profile | Get candidate profile |
| PUT | /api/candidates/profile | Update profile |
| PUT | /api/candidates/skills | Update skills |
| GET | /api/candidates/applications | List applications |

### Company Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /api/companies/profile | Get company profile |
| PUT | /api/companies/profile | Update profile |
| GET | /api/companies/jobs | List company jobs |
| GET | /api/companies/jobs/:id/applications | Get job applicants |
| PUT | /api/companies/jobs/:jobId/applications/:appId/status | Update status |
| POST | /api/companies/jobs/:id/kanban/reorder | Reorder Kanban |

### Application Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | /api/applications | Apply to job |
| GET | /api/applications/:id | Get application details |
| DELETE | /api/applications/:id | Withdraw application |

### Skill Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /api/skills | List all skills |
| GET | /api/skills/categories | Get skill categories |

---

## Matching Score Algorithm

The matching algorithm calculates a compatibility score (0-100) between candidates and job postings based on skills.

### Algorithm Logic

```csharp
public async Task<int> CalculateMatchingScore(int candidateProfileId, int jobPostingId)
{
    // Get candidate's skills with proficiency levels
    var candidateSkills = await _context.CandidateSkills
        .Where(cs => cs.CandidateProfileId == candidateProfileId)
        .ToListAsync();

    // Get job's required and optional skills
    var jobSkills = await _context.JobSkills
        .Where(js => js.JobPostingId == jobPostingId)
        .ToListAsync();

    int totalScore = 0;

    foreach (var jobSkill in jobSkills)
    {
        var candidateSkill = candidateSkills
            .FirstOrDefault(cs => cs.SkillId == jobSkill.SkillId);

        if (candidateSkill != null)
        {
            // Base points for having the skill
            if (jobSkill.IsRequired)
                totalScore += 15;  // Required skill match
            else
                totalScore += 5;   // Optional skill match

            // Bonus for meeting minimum proficiency
            if (candidateSkill.ProficiencyLevel >= jobSkill.MinProficiency)
                totalScore += 5;
        }
    }

    return Math.Min(100, totalScore);
}
```

### Scoring Breakdown

| Factor | Points |
| --- | --- |
| Required skill match | +15 |
| Optional skill match | +5 |
| Meets minimum proficiency | +5 |
| Maximum score | 100 |

---

## Deployment

### Deployment Options

1. **Local Development**: Run with npm/dotnet for rapid development
2. **Docker Compose**: Containerized deployment with all services
3. **Coolify**: Self-hosted PaaS for production deployment

### Docker Compose Configuration

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-jobconnect}
      POSTGRES_USER: ${POSTGRES_USER:-jobconnect}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-jobconnect}"]

  api:
    build:
      context: ./JobConnect.API
      dockerfile: Dockerfile
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ASPNETCORE_URLS=http://+:5000
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=${POSTGRES_DB:-jobconnect};Username=${POSTGRES_USER:-jobconnect};Password=${POSTGRES_PASSWORD}
      - JwtSettings__Secret=${JWT_SECRET}
      - CorsOrigins=${CORS_ORIGINS:-http://localhost:4200}
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./jobconnect-frontend
      dockerfile: Dockerfile.prod
    environment:
      - API_URL=https://api.yourdomain.com/api
    depends_on:
      - api

volumes:
  postgres_data:
```

### Environment Variables

| Variable | Description | Example |
| --- | --- | --- |
| POSTGRES_DB | Database name | jobconnect |
| POSTGRES_USER | Database username | jobconnect |
| POSTGRES_PASSWORD | Database password | (secure string) |
| JWT_SECRET | Token signing key | (64+ random chars) |
| CorsOrigins | Allowed origins | <https://yourdomain.com> |
| API_URL | Frontend API URL | <https://api.domain.com/api> |

---

## Screenshots

### Landing Page

![Landing Page](docs/images/landing-page.png)

The landing page introduces JobConnect with a modern, liquid glass design. Users can explore features, view testimonials, and register as either a Candidate or Company.

### Jobs Listing

![Jobs Page](docs/images/jobs-page.png)

Browse available job postings with powerful filtering by keywords, location, job type, and required skills. Each job card displays matching score for logged-in candidates.

### CV Builder

![CV Builder](docs/images/cv-page.png)

Candidates can build their professional profile with real-time preview. Add work experience, education, certifications, and skills with proficiency levels. Auto-save ensures no data loss.

### Application Tracker

![Application Tracker](docs/images/application.png)

Track all job applications in a visual pipeline. See current status (Submitted, Screening, Interview, etc.) and click to view job details.

### Company Dashboard

![Company Dashboard](docs/images/dashboard-company.png)

Companies can manage their job postings, view application statistics, and access the Kanban board for each position.

### Kanban Board

![Kanban Board](docs/images/kanban.png)

Drag-and-drop candidate management through hiring stages. View candidate profiles, update statuses, and organize your recruitment pipeline.

### Coolify Deployment

![Coolify Dashboard](docs/images/dashboard-coolify.png)

The Coolify dashboard showing all deployed JobConnect services running in production.

---

## Installation

### Prerequisites

- Node.js 20 or higher
- .NET 9 SDK
- PostgreSQL 16+ (local or cloud)
- Docker and Docker Compose (optional)
- Git for cloning the repository

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Mehdirben/JobConnect
cd JobConnect

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Option 1: Docker Compose (Recommended)
docker compose up -d

# Option 2: Manual Setup

# Backend
cd JobConnect.API
dotnet restore
dotnet ef database update
dotnet run

# Frontend (new terminal)
cd jobconnect-frontend
npm install
npm start

# Application URLs:
# Frontend: http://localhost:4200
# Backend:  http://localhost:5000
# pgAdmin:  http://localhost:5050
```

---

## Security Considerations

> [!WARNING]
> **Production Security Checklist**
>
> - Use strong, unique values for JWT_SECRET (minimum 32 random characters)
> - Always deploy behind HTTPS with valid SSL certificates
> - Configure CORS to only allow your frontend domain
> - Regularly update all dependencies
> - Enable PostgreSQL authentication with strong passwords
> - Implement rate limiting to prevent brute force attacks
> - Enable database backup automation

### Implemented Security Measures

- **Password Hashing**: BCrypt with secure salt rounds
- **JWT Authentication**: Signed tokens with configurable expiration
- **Input Validation**: Data Annotations on all DTOs
- **Role Authorization**: Separate endpoints for Candidates and Companies
- **CORS**: Configurable cross-origin resource sharing
- **HTTPS**: SSL/TLS encryption in production

---

## Conclusion

JobConnect represents a modern and comprehensive solution for applicant tracking, combining an elegant user interface with a robust backend architecture.

### Key Achievements

- **Modern Technology Stack**: Angular 21, .NET 9, PostgreSQL for optimal performance
- **Smart Matching**: Skill-based candidate-job matching with proficiency scoring
- **Dual User Experience**: Tailored interfaces for both candidates and companies
- **Kanban Pipeline**: Visual, drag-and-drop recruitment workflow management
- **Real-Time CV Builder**: Live preview with auto-save functionality
- **Flexible Deployment**: Docker and Coolify support for easy self-hosting
- **Security First**: JWT authentication, role-based access, password hashing

### Future Enhancements

- Email notifications for application updates
- Interview scheduling integration
- Resume parsing with AI
- Video interview platform integration
- Analytics dashboard for recruitment insights
- Multi-language support

---

**Repository:** [https://github.com/Mehdirben/JobConnect](https://github.com/Mehdirben/JobConnect)

---

## Part V: Annexes

This section contains key source code extracts from the JobConnect application.

## Matching Score Service

```csharp
// JobConnect.API/Services/MatchingScoreService.cs
public class MatchingScoreService : IMatchingScoreService
{
    private readonly ApplicationDbContext _context;

    public MatchingScoreService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> CalculateMatchingScore(int candidateProfileId, int jobPostingId)
    {
        var candidateSkills = await _context.CandidateSkills
            .Where(cs => cs.CandidateProfileId == candidateProfileId)
            .Select(cs => new { cs.SkillId, cs.ProficiencyLevel })
            .ToListAsync();

        var jobSkills = await _context.JobSkills
            .Where(js => js.JobPostingId == jobPostingId)
            .Select(js => new { js.SkillId, js.IsRequired, js.MinProficiency })
            .ToListAsync();

        int totalScore = 0;

        foreach (var jobSkill in jobSkills)
        {
            var candidateSkill = candidateSkills
                .FirstOrDefault(cs => cs.SkillId == jobSkill.SkillId);

            if (candidateSkill != null)
            {
                totalScore += jobSkill.IsRequired ? 15 : 5;
                
                if (candidateSkill.ProficiencyLevel >= jobSkill.MinProficiency)
                    totalScore += 5;
            }
        }

        return Math.Min(100, totalScore);
    }
}
```

---

## JWT Authentication Service

```csharp
// JobConnect.API/Services/AuthService.cs
public class AuthService : IAuthService
{
    private readonly IConfiguration _configuration;

    public AuthService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user)
    {
        var secret = _configuration["JwtSettings:Secret"];
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var expiryMinutes = int.Parse(
            _configuration["JwtSettings:ExpiryMinutes"] ?? "60");

        var token = new JwtSecurityToken(
            issuer: _configuration["JwtSettings:Issuer"],
            audience: _configuration["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

---

## Angular Auth Service with Signals

```typescript
// jobconnect-frontend/src/app/core/services/auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
    private tokenSignal = signal<string | null>(this.getValidToken());
    private userSignal = signal<AuthResponse | null>(this.loadUserFromStorage());

    readonly isAuthenticated = computed(() => 
        !!this.tokenSignal() && !this.isTokenExpired());
    readonly currentUser = computed(() => this.userSignal());
    readonly userRole = computed(() => this.userSignal()?.role ?? null);
    readonly isCandidate = computed(() => this.userRole() === 'Candidate');
    readonly isCompany = computed(() => this.userRole() === 'Company');

    constructor(
        private http: HttpClient,
        private router: Router,
        private configService: ConfigService
    ) {
        this.validateStoredToken();
    }

    login(request: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(
            `${this.configService.apiUrl}/auth/login`, 
            request
        ).pipe(tap(response => this.handleAuthSuccess(response)));
    }

    private handleAuthSuccess(response: AuthResponse): void {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response));
        this.tokenSignal.set(response.token);
        this.userSignal.set(response);
    }
}
```

---

## Runtime Configuration Service

```typescript
// jobconnect-frontend/src/app/core/services/config.service.ts
@Injectable({ providedIn: 'root' })
export class ConfigService {
    private config: AppConfig = {
        apiUrl: environment.apiUrl
    };

    private loaded = false;

    async loadConfig(): Promise<void> {
        if (this.loaded) return;
        
        try {
            const response = await fetch('/assets/config.json');
            if (response.ok) {
                const data = await response.json();
                if (data.apiUrl && !data.apiUrl.includes('${')) {
                    this.config = data;
                }
            }
        } catch (error) {
            console.warn('Using environment defaults');
        }
        
        this.loaded = true;
    }

    get apiUrl(): string {
        return this.config.apiUrl;
    }
}

// Factory for APP_INITIALIZER
export function initializeApp(configService: ConfigService): () => Promise<void> {
    return () => configService.loadConfig();
}
```

---

## Docker Entrypoint for Runtime Config

```bash
#!/bin/sh
# jobconnect-frontend/docker-entrypoint.sh

# Generate config.json from environment variables
cat > /usr/share/nginx/html/assets/config.json << EOF
{
    "apiUrl": "${API_URL:-/api}"
}
EOF

echo "Generated config.json with API_URL=${API_URL:-/api}"

# Start nginx
exec nginx -g 'daemon off;'
```
