#!/bin/bash
cd /home/ubuntu/ims_website
# Answer prompts: No truncate (Enter), No truncate (Enter), Yes to data loss (j + Enter)
printf "\n\nj\n" | pnpm drizzle-kit push
