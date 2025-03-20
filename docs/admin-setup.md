# Setting Up an Admin User in Safe HMO

To make a user an admin in the Safe HMO app, you need to update their user document in the Firebase Firestore database. Follow these steps:

## Using Firebase Console

1. Go to the [Firebase Console](https://console.firebase.google.com/) and select your project.
2. Navigate to **Firestore Database** in the left sidebar.
3. Find the `users` collection.
4. Locate the document for the user you want to make an admin (documents are named with the user's UID).
5. Click on the document to open it.
6. Click the **Edit** button (pencil icon).
7. Add or update the `role` field with the value `"admin"` (include the quotes).
8. Click **Update** to save the changes.

The user will now have admin privileges in the app. They'll be able to access:
- Admin Dashboard
- Token Usage Analytics
- Document Management

## Using Firebase CLI

If you prefer using the command line, you can use the Firebase CLI to update the user document:

```bash
# Install Firebase CLI if you haven't already
npm install -g firebase-tools

# Login to Firebase
firebase login

# Set the project
firebase use YOUR_PROJECT_ID

# Update the user document (replace USER_ID with the actual user ID)
firebase firestore:update users/USER_ID --data '{"role": "admin"}'
```

## Security Considerations

- Only grant admin access to trusted users
- Admin users can access sensitive data and perform administrative actions
- Consider implementing additional security measures for critical admin functions
