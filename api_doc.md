# Packer Server Endpoints Documentation

## Endpoint List

### Public

1. [`POST /register`](#post-register)
1. [`POST /login`](#post-login)

### Access Token Required

1. [`GET /repos`](#get-repos)
1. [`POST /repos`](#post-repos)
1. [`PATCH /repos`](#patch-repos)
1. [`GET /tasks`](#get-tasks)

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

- *400 - Bad Request*:

```json
{
  "message": "Email is required"
}
OR
{
  "message": "Password is required"
}
```

- *401 - Unauthorized*:

```json
{
  "message": "Invalid email/password"
}
```

## GET /repos

Description: List all repos in the authenticated user's watch list

Request:

- headers:

```json
{
  "access_token": "<jwt_token>"
}
```

Response:

- *200 - OK*:

```json
[
  {
    "_id": "642be7f19088def1c5e63489",
    "name": "Mailspring",
    "ownerName": "Foundry376"
  }
]
```

## POST /repos

Description: Add a new repo to the authenticated user's watch list

Request:

- headers:

```json
{
  "access_token": "<jwt_token>",
  "authorization": "<github access token>" // optional
}
```

Response:

- *201 - Created*:

```json
{
  "message": "Repo successfully added",
  "id": "<ObjectId>"
}
```

- *400 - Bad Request*:

```json
{
  "message": "Repo name is required"
}
OR
{
  "message": "Repo owner name is required"
}
OR
{
  "message": "Repo already exists"
}
OR
{
  "message": "No releases found for this repo"
}
```

## PATCH /repos

Description: Check for update for all repos in the authenticated user's watch list

Note: Even if there aren't any updates available for all of the repos, the response
      of this endpoint will still be a success since the process of checking for
      updates itself is a success.

Request:

- headers:

```json
{
  "access_token": "<jwt_token>",
  "authorization": "<github access token>" // optional
}
```

Response:

- *200 - OK*:

```json
{
  "message": "All repos successfully checked for update"
}
```

## GET /tasks

Description: Get all previously created tasks

Request:

- headers:

```json
{
  "access_token": "<jwt_token>"
}
```

Response:

- *200 - OK*:

```json
[
  {
    "_id": "642c5f80252e3c469deafac2",
    "repo": {
      "_id": "642c3cb56e786897e40aa78b",
      "name": "Mailspring",
      "ownerName": "Foundry376",
      "currentVersion": "1.10.7",
      "latestVersion": "1.10.8"
    },
    "releaseAsset": "mailspring-1.10.8-amd64.deb",
    "additionalFiles": [],
    "runCommand": "./build.sh",
    "containerImage": "vbatts/slackware:latest"
  }
  ...
]
```

## POST /tasks

Description: Add a new task

Request:

- headers:

```json
{
  "access_token": "<jwt_token>"
}
```

- body:

```json
{
  "repo": "string (ObjectId)",
  "releaseAsset": "string",
  "runCommand": "string",
  "containerImage": "string"
}
```

Response:

- *201 - Created*:

```json
{
  "message": "Task successfully added",
  "id": "<ObjectId>"
}
```

- *400 - Bad Request*:

```json
{
  "message": "Repo is required"
}
OR
{
  "message": "Release asset is required"
}
OR
{
  "message": "Run command is required"
}
OR
{
  "message": "Container Image is required"
}
```

## Global Error Responses

### When the user is not authenticated

- *401 - Unauthorized*:

```json
{
  "message": "Invalid token"
}
```

### Catch all error

- *500 - Internal Server Error*:

```json
{
  "message": "Internal server error"
}
```
