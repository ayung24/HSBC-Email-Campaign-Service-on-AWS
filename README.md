# 4-MakeBank

### Website URL
https://main.d8zlt2xxyx88t.amplifyapp.com/

### API URL
// TODO

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
- User can send an email with a POST request to the email endpoint
