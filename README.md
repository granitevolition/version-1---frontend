# User Registration Frontend

This is the frontend application for the user registration system that integrates with a PostgreSQL database. The application provides user registration, login functionality, and text humanization features.

## Features

- User registration with optional email and phone fields
- User authentication and session management
- Text humanization service integration
- AI content detection
- Dashboard with usage statistics
- Responsive design for mobile and desktop

## Build & Deployment

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run build
```

### Docker Deployment

The application includes a Dockerfile for containerized deployment:

```bash
# Build the Docker image
docker build -t user-registration-frontend .

# Run the container
docker run -p 80:80 user-registration-frontend
```

## Environment Variables

The application uses the following environment variables:

- `REACT_APP_API_URL`: URL of the backend API (default: http://localhost:5000/api/v1)
- `CI`: Set to `false` to prevent treating warnings as errors during build

## API Integration

The frontend connects to the backend API for the following functions:

- User registration and authentication
- Session verification
- Text humanization services
- Usage statistics

## Troubleshooting Common Issues

### Build Errors

If you encounter ESLint errors during build:

1. Set `CI=false` in your environment variables
2. Fix ESLint errors in your code
3. Make sure all imports are used or removed

### API Connection Issues

If the application can't connect to the API:

1. Check that the backend server is running
2. Verify that the REACT_APP_API_URL is correctly set
3. Check browser console for detailed error messages
4. Ensure CORS is properly configured on the backend

### Docker Build Issues

If Docker build fails:

1. Check the Dockerfile for correct Node.js version
2. Ensure all dependencies are properly listed in package.json
3. Set CI=false in the Dockerfile ENV section

## Recent Fixes

- Added missing API functions in api.js for user registration and authentication
- Removed unused import in humanizeApi.js to fix ESLint warning
- Added CI=false to multiple locations to prevent warnings from causing build failures
- Improved error handling for network issues
