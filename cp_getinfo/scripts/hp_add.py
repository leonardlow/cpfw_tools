#!/bin/bash

# Define the file to be copied and the host file
FILE_TO_COPY="hp_add.txt"
HOST_FILE="hosts.txt"
REMOTE_COMMAND="clish -c 'load configuration /home/admin/niisd/hp_add.txt'"

# Read the host file line by line
while IFS== read -r HOST; do
  # Copy the file to the remote host
  scp "$FILE_TO_COPY" "$HOST:/home/admin/niisd/"

  # Execute the remote command on the remote host
  ssh "$HOST" "$REMOTE_COMMAND"
done < "$HOST_FILE"