# 4-MakeBank

### Website URL
https://main.d8zlt2xxyx88t.amplifyapp.com/

### Email API URL
https://z2prvy0ul7.execute-api.ca-central-1.amazonaws.com/prod/email

### Login credential
Username: admin\
Password: admin1234

### Features and Updates
To be updated with every push to main
#### ***February 23, 2020***
- User can log in and log out
- User can view list of all uploaded templates
- User can upload a template
- Error and success toast messages
#### ***March 2, 2020***
- Spinner shows when loading templates
- Templates list automatically refreshed upon successful upload
- CI/CD for frontend and backend
- Template API key encryption (with hardcoded key)
- View template detail side panel
#### ***March 8, 2020***
- User can get a template's details by clicking on the info button
    - This includes a pre-built JSON blob a user can copy and paste, along with the URL to hit and API key to send
- User can delete a template
- Centralized CloudWatch logging when a user:
    - Logs in or logs out
    - Hits any of our API endpoints (CRD template or sends an email)
- User can send an email with a POST request to the email endpoint (experimental)
    - Sends to and from using a single email currently (Shizuko's email)
    - Authentication is not fully implemented yet
#### ***March 12, 2020***
- Delete template button now has confirmation popup before proceeding with deletion
- UI fix for tall monitors on the view details modal
- API key on view details modal is now unencrypted 
- If there are no templates, instead of a blank grid we should have a single row that says `No templates`
- Success and info toast messages now disappear after 4 seconds
    - Error toasts remain until dismissed
- Names of deleted templates can now be reused when creating new templates
- Sending an email now logs the `user-agent` because a cURL request has no cognito identity
- User can send an email with a POST request to the email endpoint
    - We send the email from Shizuko's UBC email
    - Email the user wishes to send to must be verified. Ask Make Bank to send a verification email to the email of your choice
        - This is hopefully to be resolved when we leave sandbox mode
