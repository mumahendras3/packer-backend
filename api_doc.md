# Packer Server Endpoints Documentation

## Endpoint List

1. [`POST /register`](#post-register)
1. [`POST /login`](#post-login)

## POST /register

Description: Register a new user

Request:

- body:

```json
{
  "email": "string",
  "password": "string"
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

## POST /login

Description: Get an access token for accessing protected endpoints

Request:

- body:

```json
{
  "email": "string",
  "password": "string"
}
```

Response:

- *200 - OK*:

```json
{
  "access_token": "<jwt_token>"
}
```

- *400 Bad Request*:

```json
{
  "message": "Email is required"
}
OR
{
  "message": "Password is required"
}
```

- *401 Unauthorized*:

```json
{
  "message": "Invalid email/password"
}
```
