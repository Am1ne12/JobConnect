# Deploying JobConnect on Coolify

This guide explains how to deploy the JobConnect ATS platform on [Coolify](https://coolify.io/), an open-source self-hostable platform.

## ⚠️ Common Pitfalls (Read First!)

Before deploying, be aware of these common issues:

| Issue | Solution |
| ------------------------------ | ----------------------------------------------------------------------------- |
| **Bad Gateway** | Set correct **Ports Exposes**: Frontend = `80`, Backend = `5000` |
| **Frontend can't reach API** | Set `API_URL` environment variable correctly, then **Rebuild** |
| **Database connection failed** | Verify PostgreSQL connection string and predefined network is enabled |
| **Changes not taking effect** | Use **Rebuild** not just Redeploy (Coolify caches images) |
| **CORS errors** | Add frontend domain to `CORS_ORIGINS` environment variable |

## Prerequisites

- A server with Coolify installed ([Installation Guide](https://coolify.io/docs/get-started/installation))
- A domain name (or use Coolify's wildcard domain)
- Git repository access (GitHub, GitLab, or Bitbucket)

---

## Custom Domain Setup (Namecheap)

If you're using a domain from Namecheap, follow these steps to connect it to your Coolify deployment.

### Step 1: Get Your Coolify Server IP

Find your Coolify server's public IP address:

```bash
# SSH into your Coolify server and run:
curl ifconfig.me
```

### Step 2: Configure DNS Records in Namecheap

1. Log into your [Namecheap account](https://www.namecheap.com/)
2. Go to **Domain List** → Click **Manage** on your domain
3. Navigate to the **Advanced DNS** tab
4. Add the following A Records:

| Type | Host | Value | TTL | Purpose |
| -------- | --------- | ----------------- | --------- | -------------------------------------------- |
| A Record | `@` | `YOUR_COOLIFY_IP` | Automatic | Main frontend (`yourdomain.com`) |
| A Record | `www` | `YOUR_COOLIFY_IP` | Automatic | WWW subdomain (`www.yourdomain.com`) |
| A Record | `api` | `YOUR_COOLIFY_IP` | Automatic | Backend API (`api.yourdomain.com`) |
| A Record | `coolify` | `YOUR_COOLIFY_IP` | Automatic | Coolify Dashboard (`coolify.yourdomain.com`) |

> **Note**: Replace `YOUR_COOLIFY_IP` with your actual server IP address.

### Step 3: Configure Coolify Dashboard Domain

After DNS propagation (may take up to 48 hours, usually much faster):

#### Option A: Via SSH

```bash
# Edit the Coolify environment file
nano /data/coolify/source/.env

# Update/Add the APP_URL variable
APP_URL=https://coolify.yourdomain.com

# Restart Coolify
cd /data/coolify/source
docker compose down
docker compose up -d
```

#### Option B: Via Coolify UI

1. Access Coolify dashboard using your server IP
2. Navigate to **Settings** → **Configuration**
3. Update **Instance's Domain** to `https://coolify.yourdomain.com`
4. Save and restart

### Step 4: Configure Application Domains in Coolify

**Backend Domain:**

1. Go to your Backend resource → **Settings** → **Domains**
2. Add: `https://api.yourdomain.com`
3. Ensure **Ports Exposes** is set to `5000`

**Frontend Domain:**

1. Go to your Frontend resource → **Settings** → **Domains**
2. Add: `https://yourdomain.com` and `https://www.yourdomain.com`
3. Ensure **Ports Exposes** is set to `80`

### Verify DNS Propagation

Check if your DNS records have propagated:

- Visit [whatsmydns.net](https://www.whatsmydns.net/)
- Enter your domain and check for your server IP

### Domain Summary

| Domain | Service | Port |
| ------------------------ | ------------------- | ---- |
| `yourdomain.com` | Frontend (Angular/Nginx) | 80 |
| `www.yourdomain.com` | Frontend (Angular/Nginx) | 80 |
| `api.yourdomain.com` | Backend (.NET API) | 5000 |
| `coolify.yourdomain.com` | Coolify Dashboard | 8000 |

## Architecture Overview

The JobConnect application consists of three components:

1. **PostgreSQL** - Database (deployed as a Coolify Database service)
2. **Backend** - .NET 9 Web API server
3. **Frontend** - Angular 21 application

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

### Coolify Dashboard

![Coolify Dashboard](docs/images/dashboard-coolify.png)

The Coolify dashboard provides a centralized view of all deployed services, their status, and resource usage.

---

## Step 1: Deploy PostgreSQL Database

1. In Coolify dashboard, go to your **Project** → **Environment**
2. Click **+ New** → **Database** → **PostgreSQL**
3. Configure PostgreSQL:
   - **Name**: `jobconnect-db`
   - **Version**: `16` (or latest stable)
   - **Database Name**: `jobconnect`
   - Leave other settings as default (Coolify will generate secure credentials)
4. Click **Save** then **Deploy**
5. Once deployed, note the following from the PostgreSQL resource page:
   - **Internal Host**: Usually `jobconnect-db` or the container name
   - **Port**: `5432`
   - **Username**: (auto-generated, check in Coolify UI)
   - **Password**: (auto-generated, check in Coolify UI)
   - **Connection String**: Will look like `Host=jobconnect-db;Database=jobconnect;Username=postgres;Password=xxxxx`

> **Important**: Enable **Connect to Predefined Network** on the PostgreSQL database so other services can connect to it.

---

## Step 2: Deploy Backend (.NET API Server)

### Option A: Deploy from Git Repository

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. In Coolify, go to your **Project** → **Environment**
3. Click **+ New** → **Application** → Select your Git provider
4. Select your repository and configure:
   - **Branch**: `main`
   - **Build Pack**: `Dockerfile`
   - **Dockerfile Location**: `JobConnect.API/Dockerfile`
   - **Base Directory**: `JobConnect.API`
5. Configure the **Domain**:
   - Set domain like `api.yourdomain.com`

### Environment Variables for Backend

Set the following environment variables in Coolify:

| Variable | Description | Example | Required |
| ----------------------------------------- | --------------------------- | ------------------------------------------------------------------- | -------- |
| `ASPNETCORE_ENVIRONMENT` | Environment mode | `Production` | Yes |
| `ASPNETCORE_URLS` | Server URL binding | `http://+:5000` | Yes |
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string | `Host=jobconnect-db;Database=jobconnect;Username=postgres;Password=xxxxx` | Yes |
| `JwtSettings__Secret` | Secret for JWT tokens | Generate a secure random string (32+ chars) | Yes |
| `JwtSettings__Issuer` | JWT issuer | `JobConnect` | Yes |
| `JwtSettings__Audience` | JWT audience | `JobConnectUsers` | Yes |
| `JwtSettings__ExpiryMinutes` | Token expiration | `60` | Yes |
| `CorsOrigins` | Allowed CORS origins | `https://yourdomain.com,https://www.yourdomain.com` | Yes |

> **Tip**: Use Coolify's magic variables for passwords: `${SERVICE_PASSWORD_64_BACKEND}` to auto-generate a secure JWT secret.

### Configuring the Domain and Port

1. In the backend resource settings, go to **Settings**
2. Set **Ports Exposes** to `5000` (the port your backend listens on)
3. Go to **Domains** and add your domain: `https://api.yourdomain.com`
4. Coolify will automatically configure SSL via Let's Encrypt

---

## Step 3: Deploy Frontend (Angular)

1. In Coolify, go to your **Project** → **Environment**
2. Click **+ New** → **Application** → Select your Git provider
3. Select your repository and configure:
   - **Branch**: `main`
   - **Build Pack**: `Dockerfile`
   - **Dockerfile Location**: `jobconnect-frontend/Dockerfile.prod`
   - **Base Directory**: `jobconnect-frontend`

> **Important**: Use `Dockerfile.prod` for production deployment (serves via Nginx on port 80). The regular `Dockerfile` uses the Angular dev server and is for development only.

### Environment Variables for Frontend

The frontend uses **runtime environment variables** - no need to rebuild when changing the API URL!

| Variable | Description | Example | Required |
| -------- | --------------------------------- | ---------------------------------- | -------- |
| `API_URL` | Full API URL including `/api` | `https://api.yourdomain.com/api` | Yes |

The `docker-entrypoint.sh` script generates `/assets/config.json` from the `API_URL` environment variable at container startup. This allows you to change the API URL without rebuilding the image.

### Configuring Frontend Domain and Port

1. In the frontend resource settings, go to **Settings**
2. **Important**: Set **Ports Exposes** to `80` (Nginx serves on port 80)
3. Add environment variable: `API_URL=https://api.yourdomain.com/api`
4. Go to **Domains** and add your domain: `https://yourdomain.com`

---

## Step 4: Configure Networking

### Enable Predefined Network Connection

For the backend to communicate with PostgreSQL:

1. Go to your **PostgreSQL** resource → **Settings**
2. Enable **Connect to Predefined Network**
3. Go to your **Backend** resource → **Settings**
4. Enable **Connect to Predefined Network**

This allows services to communicate using their container names as hostnames.

### CORS Configuration

CORS is configured via the `CorsOrigins` environment variable. Set it to your frontend domain(s):

```text
CorsOrigins=https://yourdomain.com,https://www.yourdomain.com
```

---

## Step 5: Database Migrations

The .NET application uses Entity Framework Core. Migrations should run automatically on startup, but you can also run them manually:

### Option A: Auto-Migration on Startup

The `Program.cs` can be configured to apply migrations automatically:

```csharp
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.Migrate();
}
```

### Option B: Manual Migration

```bash
# SSH into the backend container
docker exec -it <backend-container-name> sh

# Run migrations
dotnet ef database update
```

---

## Complete Docker Compose (Alternative)

If you prefer deploying everything as a single Docker Compose stack in Coolify:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-jobconnect}
      POSTGRES_USER: ${POSTGRES_USER:-jobconnect}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-jobconnect}"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./JobConnect.API
      dockerfile: Dockerfile
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ASPNETCORE_URLS=http://+:5000
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=${POSTGRES_DB:-jobconnect};Username=${POSTGRES_USER:-jobconnect};Password=${POSTGRES_PASSWORD}
      - JwtSettings__Secret=${JWT_SECRET:?}
      - JwtSettings__Issuer=JobConnect
      - JwtSettings__Audience=JobConnectUsers
      - JwtSettings__ExpiryMinutes=60
      - CorsOrigins=${CORS_ORIGINS:-http://localhost:4200}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./jobconnect-frontend
      dockerfile: Dockerfile.prod
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
```

### Environment Variables for Complete Stack

| Variable | Description | Example |
| ------------------- | --------------------------------- | --------------------------------------------------------- |
| `POSTGRES_DB` | Database name | `jobconnect` |
| `POSTGRES_USER` | Database username | `jobconnect` |
| `POSTGRES_PASSWORD` | Database password | (generate secure string) |
| `JWT_SECRET` | Secret for JWT tokens | (generate secure string, 32+ chars) |
| `CORS_ORIGINS` | Comma-separated allowed origins | `https://yourdomain.com,https://www.yourdomain.com` |

---

## Deployment Checklist

- [ ] PostgreSQL deployed and running
- [ ] PostgreSQL credentials noted
- [ ] Backend deployed with correct environment variables:
  - [ ] `ASPNETCORE_ENVIRONMENT=Production`
  - [ ] `ASPNETCORE_URLS=http://+:5000`
  - [ ] `ConnectionStrings__DefaultConnection` (PostgreSQL connection string)
  - [ ] `JwtSettings__Secret` (secure random string, 32+ chars)
  - [ ] `JwtSettings__Issuer=JobConnect`
  - [ ] `JwtSettings__Audience=JobConnectUsers`
  - [ ] `CorsOrigins` (frontend domain)
- [ ] Backend **Ports Exposes** set to `5000`
- [ ] Backend domain configured with SSL
- [ ] Frontend deployed
- [ ] Frontend **Ports Exposes** set to `80`
- [ ] Frontend domain configured with SSL
- [ ] Predefined network enabled for service communication
- [ ] Test the application:
  - [ ] Can access frontend URL
  - [ ] Can register a new account (Candidate or Company)
  - [ ] Can login
  - [ ] Candidates can build CV and apply to jobs
  - [ ] Companies can create jobs and manage applicants

---

## Troubleshooting

### Bad Gateway Error

This usually means Coolify's proxy can't reach your container:

1. **Check the Ports Exposes setting**:
   - Frontend should be `80` (Nginx)
   - Backend should be `5000`
2. Verify the container is running and healthy in Coolify logs
3. Rebuild the application if you recently changed the Dockerfile

### Backend can't connect to PostgreSQL

1. Verify PostgreSQL is running in Coolify
2. Check that **Connect to Predefined Network** is enabled on both services
3. Verify the `ConnectionStrings__DefaultConnection` environment variable is correct
4. Check PostgreSQL container name matches the hostname in the connection string

### Login Returns "Server Error"

This is usually caused by missing environment variables:

1. Make sure `JwtSettings__Secret` is set (at least 32 characters)
2. Make sure `JwtSettings__Issuer` and `JwtSettings__Audience` are set
3. Check backend logs in Coolify for the actual error

### Frontend Shows API Errors / Network Errors

1. **Check API URL**: Verify the environment configuration points to correct backend URL
2. **Rebuild required**: After changing environment, you must **Rebuild** the frontend
3. Check browser console (F12) for the actual API URL being called
4. Verify backend is running and accessible
5. Check for CORS errors in browser console - add your domain to `CorsOrigins`

### Image Cache Issues

Coolify caches Docker images. If your changes aren't taking effect:

1. Go to your resource in Coolify
2. Click **Rebuild** instead of **Redeploy**
3. Or enable **Force Rebuild** in settings

### Entity Framework Migration Errors

1. Check database connection string is correct
2. Ensure PostgreSQL database exists
3. Check backend logs for specific migration errors
4. Try running migrations manually via SSH

### SSL Certificate Issues

1. Ensure your domain DNS is pointing to your Coolify server
2. Wait a few minutes for Let's Encrypt to issue certificates
3. Check Coolify logs for certificate errors

---

## Useful Commands

### Check service logs in Coolify

Navigate to your resource → **Logs** tab

### Access PostgreSQL shell

```bash
# From Coolify terminal or SSH into server
docker exec -it <postgres-container-name> psql -U jobconnect -d jobconnect
```

### Check .NET API health

```bash
curl https://api.yourdomain.com/api/health
```

### Rebuild and redeploy

In Coolify, go to your resource and click **Redeploy** or **Rebuild**

---

## Security Recommendations

1. **Use strong passwords**: Let Coolify generate passwords using magic variables
2. **Enable SSL**: Always use HTTPS domains
3. **Restrict CORS**: Only allow your frontend domain in `CorsOrigins`
4. **Regular backups**: Enable automatic backups for PostgreSQL in Coolify
5. **Keep updated**: Regularly update your Docker images and dependencies
6. **JWT Secret**: Use a cryptographically secure random string (32+ characters)

---

## Support

- [Coolify Documentation](https://coolify.io/docs/)
- [Coolify Discord](https://discord.gg/coolify)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [.NET Documentation](https://docs.microsoft.com/en-us/dotnet/)
- [Angular Documentation](https://angular.io/docs)
