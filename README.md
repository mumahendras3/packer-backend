# Package Maintainer Helper (Packer)

This repo contains the server part of Packer prototype.

## The Main Job of The Server Part

- Maintain the user's repository watchlist and periodically check for the
  latest update.

- A repository in the user's watchlist consists of at least these information:

  - The repository name and owner (for uniquely identifying it)
  
  - The latest release version

  - The assets published as part of that release version

- Once a new version is detected for one of the repository in the user's
  watchlist, the user is notified through email so that they can schedule a task
  to be run automatically by the server through the use of a docker container.

- A task consists of at least these information:

  - The repository this task is for, accompanied by the latest release's assets
    that will be used for this task.

  - The container image that will be used to create the container.

  - The command to be run inside the container.

  - Additional user-supplied files that will be uploaded inside the container
    that are needed for the successful completion of this task.

- Once a scheduled task completes successfully, this repository's latest release
  version information stored locally by the server will be updated to the latest
  release version found on the upstream repository so that this repository will
  no longer be considered by the server as out of date, restarting the cycle of
  periodically checking for the latest update.
