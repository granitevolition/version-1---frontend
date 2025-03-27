# Andikar AI Frontend

This repository contains the frontend code for the Andikar AI text humanizer application. The frontend allows users to register, login, and use the humanizing feature to transform AI-generated text into more human-like text.

## Recent Fixes

- **Fixed Dashboard Humanizer Section**: Enhanced the Dashboard component to properly display the text humanizing feature with improved styling and visibility
- **Improved API Integration**: Updated the humanizeApi.js to correctly connect to the backend and fallback to direct API access if needed
- **Enhanced User Interface**: Added clear visual indicators for server status and improved the styling of the humanizer text area
- **Configuration Updates**: Added proper .env file with correct API URLs
- **Error Handling**: Improved error messaging when services are unavailable

## Environment Configuration

The application uses the following environment variables:

- `REACT_APP_API_URL`: URL for the backend API (default: http://localhost:5000/api/v1)
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
2. **Humanizer API**: Directly processes text humanization requests (used as fallback)

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
