# Environment Variables Setup

According to [Expo's documentation](https://docs.expo.dev/eas/environment-variables/), sensitive API keys and credentials should **not** be stored directly in the `eas.json` file, as it's typically committed to version control.

## Setting up Environment Variables (Recommended Method)

### 1. Use EAS Secret Management

Store all sensitive environment variables using EAS Secrets:

```bash
# OpenAI API Key
npx eas secret:create --scope project --name OPENAI_API_KEY --value "sk-your-key-here"
npx eas secret:create --scope project --name OPENAI_MODEL --value "gpt-3.5-turbo"
npx eas secret:create --scope project --name OPENAI_EMBEDDING_MODEL --value "text-embedding-ada-002"

# Firebase Configuration
npx eas secret:create --scope project --name FIREBASE_API_KEY --value "your-api-key"
npx eas secret:create --scope project --name FIREBASE_AUTH_DOMAIN --value "your-project.firebaseapp.com"
npx eas secret:create --scope project --name FIREBASE_PROJECT_ID --value "your-project-id"
npx eas secret:create --scope project --name FIREBASE_STORAGE_BUCKET --value "your-project.appspot.com"
npx eas secret:create --scope project --name FIREBASE_MESSAGING_SENDER_ID --value "sender-id"
npx eas secret:create --scope project --name FIREBASE_APP_ID --value "app-id"
npx eas secret:create --scope project --name FIREBASE_MEASUREMENT_ID --value "G-measurement-id"
```

### 2. Viewing Current Secrets

To see what secrets are currently configured:

```bash
npx eas secret:list
```

### 3. Development Environment Variables

For local development, create a `.env` file (already in `.gitignore`) containing your development environment variables:

```
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=sender-id
FIREBASE_APP_ID=app-id
FIREBASE_MEASUREMENT_ID=G-measurement-id
```

## How Environment Variables Are Accessed

Environment variables are accessed in your code via:

### In JavaScript/TypeScript
```javascript
// Access environment variables
const apiKey = process.env.OPENAI_API_KEY;
```

### In app.config.js
```javascript
export default {
  expo: {
    // ...
    extra: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || "",
      },
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY || "",
        // ...other Firebase config
      }
    }
  }
}
```

## Security Best Practices

1. **Never commit API keys to Git**: Remove any API keys from eas.json or other tracked files
2. **Use EAS Secrets**: Store all sensitive data as EAS Secrets
3. **Scope secrets appropriately**: Use account, project, or profile scope as needed
4. **Rotate credentials if exposed**: If credentials are accidentally exposed, rotate them immediately

## Additional Notes

* Non-sensitive configuration can still be stored in eas.json
* Profile-specific variables can be set with: `npx eas secret:create --scope project --name VARIABLE_NAME --value "value" --profile production`
