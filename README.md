# 4-MakeBank

### Website Production URL
https://main.d8zlt2xxyx88t.amplifyapp.com/

### Website Development URL
https://dev.d8zlt2xxyx88t.amplifyapp.com/

### Email API Production URL
https://z2prvy0ul7.execute-api.ca-central-1.amazonaws.com/prod/email/?templateid={id}

### Email API Development URL
https://u1dptgtyh1.execute-api.us-west-2.amazonaws.com/prod/email/?templateid={id}


#### Sample Email cURL Request
```
curl -X POST https://z2prvy0ul7.execute-api.ca-central-1.amazonaws.com/prod/email/?templateid=id123 -H "APIKey:<API-KEY>" -H "Content-Type: application/json" --data-raw '{"subject":"Hello World","recipient":"test@email.com","fields":{"AMOUNT":"$1,000,000","NAME":"User","PROMO_CODE":"ABCD1234"}}'
```

### Login Credentials
Username: admin\
Password: admin1234\
Along with the users in this sheet: https://docs.google.com/spreadsheets/d/16ARvShxF5i2GBT0YoVtS1XhPdvRVIX13GBtcWlnSWWw/edit?usp=sharing


### Features and Updates
To be updated with every push to main
#### ***February 23, 2021***
- User can log in and log out
- User can view list of all uploaded templates
- User can upload a template
- Error and success toast messages
#### ***March 2, 2021***
- Spinner shows when loading templates
- Templates list automatically refreshed upon successful upload
- CI/CD for frontend and backend
- Template API key encryption (with hardcoded key)
- View template detail side panel
#### ***March 8, 2021***
- User can get a template's details by clicking on the info button
    - This includes a pre-built JSON blob a user can copy and paste, along with the URL to hit and API key to send
- User can delete a template
- Centralized CloudWatch logging when a user:
    - Logs in or logs out
    - Hits any of our API endpoints (CRD template or sends an email)
- User can send an email with a POST request to the email endpoint (experimental)
    - Sends to and from using a single email currently (Shizuko's email)
    - Authentication is not fully implemented yet
#### ***March 12, 2021***
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
#### ***March 23, 2021***
- Error toasts now disappear after 6 seconds
- Toasts of the same error will overwrite the previous
    - e.g. Entering an invalid email, then entering a different invalid email will update the error toast to the latest erroneous email
- Error toasts now display detailed error messages upon a user error
    - User errors are errors that can be corrected by a user
    - e.g. Creating a template with a non unique name
- Email API endpoint is secured by API key of template
- Email API endpoint now requires template id as query parameter
    - We need the template id to check the API key, which was previously provided in the request body
    - AWS API Gateway authorizers do not include request bodies
    - "Enhanced request authorizer Lambda functions receive an event object that is similar to proxy integrations. It contains all of the information about a request, excluding the body." - https://aws.amazon.com/blogs/compute/using-enhanced-request-authorizers-in-amazon-api-gateway/
#### ***March 28, 2021***
- Newly added templates now show up first
- Empty .docx file uploaded as templates show error toast
- Templates with invalid dynamic fields show error toast. Dynamic fields must be non-empty and only contain uppercase letters, numbers or underscores.
    - e.g. ${DYNAMIC_FIELD123} is allowed
    - e.g. ${} is not allowed
    - e.g. ${dynamic_field} is not allowed
    - e.g. ${DYNAMIC#()} is not allowed
- UI has preview template button to preview the HTML
- UI has send email button to send from UI (there is still the option to send via cURL or Postman)
- UI has cURL request preview
- Previous build cURL requests fail. This is fixed in this build
- Non-functional: Added security and service tests
#### ***April 5, 2021***
- UI bug fixes and error message improvements
- Upload template performance enhancements
- Email send now uses a SQS queue to handle concurrent send requests
- Sender email now uses `makebank.testmain@gmail.com`
- Batch send now available:
    1. In template details side panel, switch to `Batch` tab
    2. Drag & Drop a .csv/.xlsx file to upload area<br>
      - Example valid CSV for a template with dynamic fields ${AMOUNT}, ${NAME}, ${PROMO_CODE}: [csv_sample.xlsx](https://github.com/CPSC319-HSBC/4-MakeBank/files/6260830/csv_sample.xlsx)
    4. Click send button
#### ***April 8, 2021***
- User can view email event logs for each template
    - Has filtering on event
    - Has filtering on time
    - Includes trackable links (every link trackable)
- Bug fix for duplicate dynamic fields
#### ***April 9, 2021***
- User can search for a template (case sensitive)
- Batch send bug fixs
    - Error on extra columns in CSV
    - Error on blank fields
    - Warning on duplicate rows
- Email event logs enhancements
    - Logs now show local timezone
    - Logs also show failures
- Different template loading behaviour for better performance
- Added new users for logins associated with the test emails
    - https://docs.google.com/spreadsheets/d/16ARvShxF5i2GBT0YoVtS1XhPdvRVIX13GBtcWlnSWWw/edit?usp=sharing
