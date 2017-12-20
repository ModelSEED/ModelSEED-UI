#!/bin/bash
git rev-parse --short HEAD > version/version.txt
git rev-parse HEAD | git log -1 --pretty=tformat:%aD:%H  > version/deploy-date.txt
echo 'master' > version/branch.txt