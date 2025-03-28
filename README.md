# Event Locator Application

A multi-user event locator backend built with Node.js, PostgreSQL (PostGIS), Sequelize, and Redis.

## Features

- User registration/login with password hashing
- Event CRUD with location, date/time, and categories
- Location-based search (radius) and category filtering
- Multilingual support (English, Spanish, French)
- Notifications via Redis Pub/Sub (24h before events)
- Event ratings and favorites
- Unit tests with Jest

## Setup Instructions

1. **Install Dependencies**:

   - Node.js: `https://nodejs.org/`
   - PostgreSQL: `https://www.postgresql.org/`
   - Redis: `https://redis.io/`
   - Run `npm install`

2. **Configure Environment**:
   - Create `.env`:DATABASE_URL=postgres://user:password@localhost:5432/event_locator
     JWT_SECRET=your_jwt_secret
     REDIS_URL=redis://localhost:6379
     PORT=3000

- Replace `user`, `password`, and `your_jwt_secret`.

3. **Start Services**:

- PostgreSQL: `docker run --name postgres -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=event_locator -p 5432:5432 -d postgres`
- Redis: `docker run --name redis -p 6379:6379 -d redis`

4. **Run Application**:

- `npm start`

5. **Run Tests**:

- `npm test`

## API Endpoints

- **Auth**:
- `POST /auth/register` - Register user
- `POST /auth/login` - Login and get JWT

- **Events**:
- `POST /events` - Create event (auth)
- `GET /events` - List all events
- `GET /events/:id` - Get event by ID
- `PUT /events/:id` - Update event (auth, creator)
- `DELETE /events/:id` - Delete event (auth, creator)
- `GET /events/search?radius=&lat=&lng=&categories=` - Search events
- `POST /events/:id/rate` - Rate event (auth)
- `POST /events/:id/favorite` - Favorite event (auth)
- `GET /events/favorites` - Get favorites (auth)

## Notes

- Location format: `{ lat: number, lng: number }`
- Categories: Array of strings (e.g., `["music", "sports"]`)
