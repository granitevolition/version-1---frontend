# Frontend for User Registration System

This repository contains a React-based frontend for a user registration system that connects to the backend API.

## Features

- User registration form with validation
- Clean and responsive design
- Connection to backend API

## Setup

1. Clone this repository
2. Install dependencies with `npm install`
3. Set up environment variables by creating a `.env.local` file:
   ```
   REACT_APP_API_URL=http://localhost:3000/api
   ```
4. Run the development server with `npm start`

## Deployment on Railway

This repository is configured for easy deployment on Railway:

1. Create a new service in Railway linked to this repository
2. Set the required environment variables:
   - `REACT_APP_API_URL` (pointing to your deployed backend API)
3. Railway will automatically deploy the frontend

## Connection to Backend

This frontend is designed to work with the backend API from the `version-1---backend` repository. It makes API calls to the `/api/users/register` endpoint to register new users.

## Repository Structure

- `src/`: Source code
  - `components/`: React components
  - `services/`: API services for backend communication
  - `styles/`: CSS files
- `public/`: Static assets
