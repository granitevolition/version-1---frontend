# Version 1 Frontend Application

Frontend interface for user registration system.

## Getting Started

### Prerequisites
- Node.js (v16 or newer)
- npm or yarn
- Backend API service running at the configured endpoint

### Installation

1. Clone the repository:
```bash
git clone https://github.com/granitevolition/version-1---frontend.git
cd version-1---frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
- Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
- Update the variables in the `.env` file to match your environment.

### Development

Run the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`.

## Deployment

### Deploying to Railway

The application can be deployed to Railway using the following steps:

1. Push your code to GitHub
2. Connect your Railway project to your GitHub repository
3. Set the required environment variables in the Railway project settings
4. Railway will automatically deploy your application

Manually trigger a deployment:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy your project
railway up
```

### Environment Variables

Create a `.env` file with the following variables:

```
REACT_APP_API_URL=http://localhost:5000/api/v1
```

For production, set these in your Railway project settings.

## Available Features

- User Authentication (Login/Registration)
- User Dashboard
- AI Content Detection
- Connectivity Testing

## Recent Changes

- Removed Humanize functionality
- Updated AI Detector to work independently
- Improved error handling and status reporting

