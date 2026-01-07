# JobConnect - Plateforme de Recrutement

## 📋 Description

JobConnect est une plateforme de recrutement complète permettant aux **candidats** de postuler à des offres d'emploi et aux **entreprises** de gérer leurs recrutements. La plateforme inclut des fonctionnalités avancées comme la planification d'entretiens vidéo avec 100ms/Daily.co, un système de notifications en temps réel, et un tableau Kanban pour le suivi des candidatures.

---

## 🏗️ Architecture

```
JobConnect/
├── JobConnect.API/          # Backend .NET 8 (C#)
│   ├── Controllers/         # API REST endpoints
│   ├── Models/              # Entités de base de données
│   ├── Services/            # Logique métier
│   └── Data/                # DbContext EF Core
│
└── jobconnect-frontend/     # Frontend Angular 19
    ├── src/app/
    │   ├── core/            # Services partagés
    │   ├── features/        # Composants par fonctionnalité
    │   └── shared/          # Composants réutilisables
    └── ...
```

---

## 🛠️ Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Backend** | .NET 8, Entity Framework Core |
| **Frontend** | Angular 19, TypeScript, SCSS |
| **Base de données** | PostgreSQL |
| **Vidéoconférence** | 100ms / Daily.co |
| **Authentification** | JWT (JSON Web Tokens) |

---

## 🎯 Fonctionnalités Principales

### 1. Gestion des Utilisateurs
- **Inscription/Connexion** avec authentification JWT
- **Deux rôles** : Candidat et Entreprise
- **Profils** personnalisables avec CV, compétences, expériences

### 2. Offres d'Emploi
- Création, modification, publication d'offres
- Filtrage par localisation, type de contrat, salaire
- Score de matching automatique candidat/offre

### 3. Candidatures
- Suivi des candidatures en temps réel
- Tableau Kanban pour les entreprises (Submitted → Screening → Interview → Offer → Hired/Rejected)
- Notes et commentaires sur les candidats

### 4. Entretiens Vidéo (100ms/Daily.co)
- Planification d'entretiens par les candidats
- Salle vidéo intégrée (accessible 5 min avant l'entretien)
- Report et annulation avec motif
- Chat en temps réel pendant l'entretien

### 5. Système de Notifications
- Notifications persistantes en base de données
- Dropdown dans la navbar avec badge de comptage
- Plusieurs types de notifications automatiques

---

## 🔔 Système de Notifications

### Types de Notifications

| Type | Déclencheur | Destinataire | Message |
|------|-------------|--------------|---------|
| `interview_scheduled` | Candidat planifie un entretien | Entreprise | "X a planifié un entretien pour Y le Z" |
| `interview_cancelled` | Annulation d'entretien | L'autre partie | "X a annulé l'entretien pour Y" |
| `application_received` | Candidat postule | Entreprise | "X a postulé à votre offre Y" |
| `application_status` | Changement de statut dans Kanban | Candidat | "Votre candidature est passée à l'étape: X" |

### API Endpoints

```http
GET    /api/notifications           # Liste des notifications
GET    /api/notifications/count     # Nombre non lues
PUT    /api/notifications/{id}/read # Marquer comme lue
PUT    /api/notifications/read-all  # Tout marquer comme lu
DELETE /api/notifications/{id}      # Supprimer une notification
DELETE /api/notifications           # Supprimer toutes
```

### Frontend Service

```typescript
// notification.service.ts
appNotifications = signal<AppNotification[]>([]);
unreadCount = computed(() => this.appNotifications().filter(n => !n.isRead).length);

loadNotifications()        // Charge depuis l'API
markAsRead(id)             // Marque une notification comme lue
markAllAsRead()            // Marque toutes comme lues
deleteNotification(id)     // Supprime une notification
deleteAllNotifications()   // Supprime toutes les notifications
```

---

## 🎥 Entretiens Vidéo (100ms/Daily.co)

### Configuration

```env
# JobConnect.API/.env
DAILY_API_KEY=your_daily_api_key_here
```

### Flux de Planification

1. **Candidat** consulte les disponibilités de l'entreprise
2. **Candidat** sélectionne un créneau et planifie l'entretien
3. **Système** crée une room Daily.co avec tokens d'accès
4. **5 minutes avant** : bouton "Rejoindre" activé
5. **Pendant l'entretien** : vidéo HD + chat intégré

### API Endpoints

```http
POST   /api/interviews                    # Créer un entretien
GET    /api/interviews                    # Liste des entretiens
GET    /api/interviews/{id}               # Détails d'un entretien
GET    /api/interviews/{id}/join          # Obtenir token pour rejoindre
PUT    /api/interviews/{id}/cancel        # Annuler avec motif
PUT    /api/interviews/{id}/reschedule    # Reporter
POST   /api/interviews/{id}/messages      # Envoyer un message
```

### Service de Planification

```csharp
// InterviewSchedulingService.cs
ScheduleInterviewAsync(applicationId, scheduledAt, candidateId)
CancelInterviewAsync(interviewId, reason)         // Supprime l'entretien
RescheduleInterviewAsync(interviewId, newDate, reason)
GenerateMeetingToken(interview, role)             // Token Daily.co
```

---

## 📊 Tableau Kanban (Entreprises)

### Colonnes

| Statut | Couleur | Description |
|--------|---------|-------------|
| Submitted | 🔵 Bleu | Nouvelles candidatures |
| Screening | 🟡 Jaune | En cours d'examen |
| Interview | 🟣 Violet | Entretien planifié |
| Offer | 🟢 Vert | Offre envoyée |
| Hired | ✅ Vert foncé | Candidat embauché |
| Rejected | 🔴 Rouge | Candidature refusée |

### API Endpoint

```http
POST /api/companies/jobs/{jobId}/kanban/reorder

Body: [
  { "applicationId": 1, "newStatus": "Screening", "newOrder": 0 },
  { "applicationId": 2, "newStatus": "Interview", "newOrder": 1 }
]
```

---

## 🔐 Authentification

### JWT Configuration

```json
// appsettings.json
{
  "Jwt": {
    "Key": "your-secret-key-min-32-characters",
    "Issuer": "JobConnect",
    "Audience": "JobConnect"
  }
}
```

### Endpoints

```http
POST /api/auth/register    # Inscription
POST /api/auth/login       # Connexion (retourne JWT)
GET  /api/auth/me          # Utilisateur courant
```

---

## 🚀 Installation et Lancement

### Prérequis

- .NET 8 SDK
- Node.js 18+
- PostgreSQL
- Docker (optionnel)

### Backend

```bash
cd JobConnect.API

# Configuration
cp .env.example .env
# Éditer .env avec vos credentials

# Lancer
dotnet run
# → http://localhost:5001
```

### Frontend

```bash
cd jobconnect-frontend

npm install
npm start
# → http://localhost:4200
```

### Base de données

```bash
# Avec Docker
docker run -d \
  --name jobconnect-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=jobconnect \
  -p 5432:5432 \
  postgres:15

# Migrations automatiques au démarrage de l'API
```

---

## 📁 Structure des Modèles

### Entités Principales

```csharp
User                    // Utilisateur (email, password, role)
CandidateProfile        // Profil candidat (CV, compétences)
Company                 // Profil entreprise
JobPosting              // Offre d'emploi
Application             // Candidature
Interview               // Entretien planifié
Notification            // Notification persistante
```

### Relations

```
User ←→ CandidateProfile (1:1)
User ←→ Company (1:1)
Company → JobPosting (1:N)
JobPosting → Application (1:N)
CandidateProfile → Application (1:N)
Application → Interview (1:1)
User → Notification (1:N)
```

---

## 🔧 Composants Frontend Clés

### Shared Components

| Composant | Description |
|-----------|-------------|
| `ConfirmModalComponent` | Modal de confirmation avec input optionnel |
| `NotificationService` | Gestion des notifications (toast + persistantes) |

### Features

| Module | Composants |
|--------|------------|
| `interview/` | `InterviewListComponent`, `BookInterviewComponent`, `VideoRoomComponent` |
| `company/` | `KanbanBoardComponent`, `CandidatesViewComponent`, `DashboardComponent` |
| `candidate/` | `ApplicationTrackerComponent`, `CVBuilderComponent` |

---

## 📝 Variables d'Environnement

### Backend (.env)

```env
# Base de données
DATABASE_URL=Host=localhost;Database=jobconnect;Username=postgres;Password=postgres

# JWT
JWT_KEY=your-secret-key-at-least-32-characters-long
JWT_ISSUER=JobConnect
JWT_AUDIENCE=JobConnect

# Daily.co (Vidéoconférence)
DAILY_API_KEY=your_daily_api_key
```

### Frontend (environment.ts)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5001/api'
};
```

---

## 📄 Licence

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

---

## 👥 Auteurs

- **Amine** - Développeur Full Stack

---

*Documentation générée le 07/01/2026*
