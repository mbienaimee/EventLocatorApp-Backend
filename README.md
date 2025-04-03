# Event Locator API

Welcome to the Event Locator API, a delightful system for managing citizens and events in our toy city of Kigali, Rwanda! Built with Node.js, Express, Sequelize, PostgreSQL (with PostGIS), Redis, and Swagger, this API allows citizens to register, log in, create events, rate and favorite them, and search for events based on preferences and proximity. The town crier delivers location-based notifications via Redis Pub/Sub, and the API supports multiple languages (English, Spanish, French) for a global audience.

## Features

- **User Authentication:** Register and log in with email and password (hashed with bcrypt).
- **Event Management:** Create, update, delete, rate, and favorite events.
- **Location-Based Search:** Find events near a given latitude/longitude using PostGIS.
- **Notifications:** Publish event updates to subscribers via Redis Pub/Sub.
- **Internationalization (i18n):** Supports `en`, `es`, and `fr` via Accept-Language header or `?lang` query parameter.
- **API Documentation:** Interactive Swagger UI at `/api-docs`.

## Tech Stack

- **Node.js & Express:** Backend framework.
- **Sequelize:** ORM for PostgreSQL with PostGIS for geospatial data.
- **Redis:** Pub/Sub for real-time event notifications.
- **bcrypt:** Password hashing for security.
- **JWT:** Token-based authentication.
- **i18next:** Internationalization support.
- **Swagger:** API documentation.
- **NodeGeocoder:** Geocoding with OpenStreetMap.

## Prerequisites

- **Node.js:** v16 or higher
- **PostgreSQL:** v13+ with PostGIS extension
- **Redis:** v6+
- **npm:** For package management

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd event-locator-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory and add:

```ini
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/event_locator_db
JWT_SECRET=your-secret-key-here
REDIS_HOST=localhost
REDIS_PORT=6379
```

Replace `DATABASE_URL` with your PostgreSQL connection string. Use a strong `JWT_SECRET` for token signing.

### 4. Set Up PostgreSQL

Create a database:

```sql
CREATE DATABASE event_locator_db;
```

Enable PostGIS:

```sql
\c event_locator_db
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 5. Set Up Redis

Install Redis locally or use a Redis cloud service. Ensure Redis is running on the specified `REDIS_HOST` and `REDIS_PORT`.

### 6. Run Database Migrations

Sync the Sequelize models with your database:

```bash
npx sequelize db:migrate
```

### 7. Start the Server

```bash
npm start
```

The API will run on `http://localhost:3000`.

## Usage

### API Endpoints

Explore the full API via Swagger UI at `http://localhost:3000/api-docs`. Key endpoints include:

#### Authentication

- **POST /auth/register:** Register a new citizen.
  ```bash
  curl -X POST "http://localhost:3000/auth/register?lang=en" -d '{"email": "user@example.com", "password": "Pass123!", "location": "Kigali, Rwanda", "preferences": ["music"]}' -H "Content-Type: application/json"
  ```
  **Response:**
  ```json
  {
    "message": "Citizen welcomed successfully",
    "id": 1,
    "email": "user@example.com"
  }
  ```
- **POST /auth/login:** Log in and get a JWT token.
  ```bash
  curl -X POST "http://localhost:3000/auth/login?lang=fr" -d '{"email": "user@example.com", "password": "Pass123!"}' -H "Content-Type: application/json"
  ```
  **Response:**
  ```json
  { "message": "Clé accordée avec succès", "token": "eyJhbGciOiJIUzI1NiIs..." }
  ```

#### Events

- **POST /events:** Create an event (requires token).
- **GET /events:** List all events.
- **GET /events/search:** Search events by preferences and proximity.
- **PUT /events/{id}:** Update an event (creator only).
- **DELETE /events/{id}:** Delete an event (creator only).
- **POST /events/{id}/rate:** Rate an event (1-5 stars).
- **POST /events/{id}/favorite:** Favorite an event.
- **GET /events/favorites:** List user’s favorite events.

### Language Support

- Add `?lang=en`, `?lang=es`, or `?lang=fr` to any endpoint URL.
- Alternatively, set the `Accept-Language` header (e.g., `Accept-Language: fr`).

## Project Structure

```
event-locator-api/
├── config/
│   └── redis.js         # Redis configuration
├── controllers/
│   ├── authRoutes.js    # Authentication endpoints
│   └── eventController.js # Event management endpoints
├── locales/
│   ├── en.json         # English translations
│   ├── es.json         # Spanish translations
│   └── fr.json         # French translations
├── models/
│   ├── Event.js        # Event model
│   ├── User.js         # User model
│   ├── Rating.js       # Rating model
│   └── Favorite.js     # Favorite model
├── services/
│   └── notificationService.js # Redis subscriber (optional)
├── .env                # Environment variables
├── app.js              # Main application file
├── swagger.yml         # Swagger API documentation
└── package.json        # Dependencies and scripts
```

## Testing

### Manual Testing

1. Start the server: `npm start`.
2. Open Swagger UI: `http://localhost:3000/api-docs`.
3. Register a user, log in, and use the token to test event endpoints with different `?lang` values.

### Automated Testing (Optional)

Add a test suite with a framework like Jest:

```bash
npm install --save-dev jest supertest
```

Create a `tests/` folder and add test files (e.g., `auth.test.js`). Run tests:

```bash
npm test
```

### link to the video

[video link](https://www.youtube.com/watch?v=4K1mCAFlcgU)
