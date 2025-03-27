# Andikar AI Frontend

This repository contains the frontend code for the Andikar AI text humanizer application. The frontend allows users to register, login, and use the humanizing feature to transform AI-generated text into more human-like text.

## Recent Fixes

- **Fixed Dashboard Humanizing Text Box**: Fixed the main issue where the text box for humanizing content wasn't displaying properly on the dashboard.
- **Corrected API Endpoints**: Updated the application to use the correct backend and humanizer API endpoints.
- **Fixed Environment Configuration**: Added proper environment variables with the correct URLs for production deployment.
- **Enhanced Error Handling**: Improved error messages when services are unavailable.
- **Simplified API Integration**: Updated the humanizeApi.js to directly use the humanizer service.

## Environment Configuration

The application uses the following environment variables:

- `REACT_APP_API_URL`: URL for the backend API (default: https://version-1-backend-production.up.railway.app/api/v1)
- `REACT_APP_HUMANIZER_API_URL`: URL for the humanizer API (default: https://web-production-3db6c.up.railway.app)

## Available Features

- **User Authentication**: Register and login to access the application
- **Text Humanizing**: Convert AI-generated text to more human-like text
- **User Dashboard**: View profile information and access the text humanizer
- **Service Status Indicators**: Visual indicators for backend service availability

## Key Components

- **Dashboard.js**: Main user interface after login, contains the humanizing feature
- **LoginForm.js**: User login interface
- **RegistrationForm.js**: New user registration interface
- **HumanizeText.js**: Dedicated page for text humanization (also available directly on Dashboard)
- **AiDetector.js**: Simple AI text detection

## API Integration

The frontend integrates with two main APIs:

1. **Backend API**: Handles authentication, user management, and proxies humanization requests
2. **Humanizer API**: Directly processes text humanization requests

## Troubleshooting

If the humanizer text box doesn't display:
- Check browser console for errors
- Verify the REACT_APP_API_URL and REACT_APP_HUMANIZER_API_URL are correct in .env
- Make sure you're logged in (the dashboard requires authentication)
- Check network tab in developer tools to see if API calls are working
- If backend is unavailable, the UI will show a warning banner

## Development

To run the application locally:

```bash
# Install dependencies
npm install

# Start development server
npm start
```

## Deployment

The application is deployed on Railway. To deploy updates:

1. Commit and push changes to GitHub
2. Railway will automatically deploy the updated code
