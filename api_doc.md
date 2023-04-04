# Packer Server Endpoints Documentation

## Endpoint List

1. [`POST /register`](#post-register)

## POST /register

Description: Register a new user

Request:

- body:

```json
{
  "email": "string",
  "password": "string",
  "githubAccessToken": "string"
}
```

Response:

- *201 - Created*:

```json
{
  "message": "Registration successful",
  "email": "<newly_registered_user_email>"
}
```

- *400 - Bad Request*:

```json
{
  "message": "Email is required"
}
OR
{
  "message": "Invalid email format"
}
OR
{
  "message": "This email has already been registered"
}
OR
{
  "message": "Password is required"
}
```
