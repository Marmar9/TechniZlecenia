Each user has
ID - uuid pk
first_name - string
last_name - string
name - string
email - string
salt - [u8; 256]
password_hash - [u8; 256]
refresh_token_version - uuid
profile_id - uuid fk

Post
id
owner_id
title
description

Each profile has
profile_id - uuid pk
