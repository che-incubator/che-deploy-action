[![codecov](https://img.shields.io/codecov/c/github/che-incubator/che-deploy-action)](https://codecov.io/gh/che-incubator/che-deploy-action)

# Eclipse Che - Deploy Github Action

This Github action will deploy instance of Eclipse Che.



## pre-requisites:
 - running minikube instance (with ingress addons)
 - tested on ubuntu 20.04

# Usage

```yaml
# Install che
name: che

# Trigger the workflow on push or pull request
on: [push, pull_request]

jobs:
  install:
    runs-on: ubuntu-20.04
    steps:
      - name: Deploy Eclipse Che
        id: deploy-che
        uses: che-incubator/che-deploy-action@main
```

# Configuration

```yaml
steps:
  - name: Deploy Eclipse Che
    id: deploy-che
      uses: che-incubator/che-deploy-action@main
      with:
        <Use a parameter from the list below>: <specify here the value>
```

## plugin-registry-image
Specify the image to use for the plug-in registry. Format: image:tag

## devfile-registry-image
Specify the image to use for the devfile registry. Format: image:tag
    required: false

## che-server-image
Specify the image to use for the che server. Format: image:tag

## skip-chectl-install
Skip chectl install step if set to true. In this case, chectl needs to be available in the PATH

## chectl-channel
Channel to use for chectl. Default is next. Choice: 'next' or 'stable'

# Output

This action will set outputs to the current step

## che-url
URL of the che-server started by this action

## che-token
User Access Token
