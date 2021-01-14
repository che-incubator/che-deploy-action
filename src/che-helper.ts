/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as core from '@actions/core';
import * as execa from 'execa';
import * as fs from 'fs-extra';
import * as jsyaml from 'js-yaml';

import { inject, injectable } from 'inversify';

import { Configuration } from './configuration';

@injectable()
export class CheHelper {
  @inject(Configuration)
  private configuration: Configuration;

  public static DEFAULT_CONFIG = {
    spec: {
      auth: {
        updateAdminPassword: false,
      },
      server: {
        customCheProperties: {
          CHE_WORKSPACE_SIDECAR_IMAGE__PULL__POLICY: 'IfNotPresent',
          CHE_WORKSPACE_PLUGIN__BROKER_PULL__POLICY: 'IfNotPresent',
          CHE_INFRA_KUBERNETES_PVC_JOBS_IMAGE_PULL__POLICY: 'IfNotPresent',
        },
      },
    },
  };

  getCustomResource(): string {
    const customResource = CheHelper.DEFAULT_CONFIG;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customResourceSpecServer = customResource.spec.server as any;
    const pluginRegistryCustomImage = this.configuration.pluginRegistryImage();
    if (pluginRegistryCustomImage) {
      customResourceSpecServer.pluginRegistryImage = pluginRegistryCustomImage;
      customResourceSpecServer.pluginRegistryPullPolicy = 'IfNotPresent';
    }

    const devfileRegistryCustomImage = this.configuration.devfileRegistryImage();
    if (devfileRegistryCustomImage) {
      customResourceSpecServer.devfileRegistryImage = devfileRegistryCustomImage;
      customResourceSpecServer.devfileRegistryPullPolicy = 'IfNotPresent';
    }

    const cheServerCustomImage = this.configuration.cheServerImage();
    if (cheServerCustomImage) {
      const split = cheServerCustomImage.split(':');
      if (!split || split.length !== 2) {
        throw new Error(
          `che server image needs to be in format: [server/]imageName:imageTag. Found ${cheServerCustomImage}`
        );
      }
      const imageName = split[0];
      const imageTag = split[1];
      customResourceSpecServer.cheImage = imageName;
      customResourceSpecServer.cheImageTag = imageTag;
      customResourceSpecServer.cheImagePullPolicy = 'IfNotPresent';
    }

    // content is yaml from the customResource object
    return jsyaml.dump(customResource);
  }

  async serverDeploy(): Promise<void> {
    core.info('Calling chectl server:deploy...');

    const customResourceContent = this.getCustomResource();
    const CUSTOM_RESOURCE_PATH = '/tmp/custom-resource-patch.yaml';

    await fs.writeFile(CUSTOM_RESOURCE_PATH, customResourceContent);
    // execute chectl
    const chectlProcess = execa('chectl', [
      'server:deploy',
      '--listr-renderer=verbose',
      '--platform=minikube',
      `--che-operator-cr-patch-yaml=${CUSTOM_RESOURCE_PATH}`,
      '--chenamespace=eclipse-che',
    ]);

    if (chectlProcess.stdout) {
      chectlProcess.stdout.pipe(process.stdout);
    }
    if (chectlProcess.stderr) {
      chectlProcess.stderr.pipe(process.stderr);
    }

    await chectlProcess;
  }

  async defineCheUrlOutputValue(): Promise<void> {
    core.info('Setting Github Action output value "che-url"...');

    // grab che url and store it
    const getCheIngressProcess = await execa('kubectl', [
      'get',
      'ingress',
      'che',
      '-n',
      'eclipse-che',
      '-o',
      "jsonpath='{.spec.rules[0].host}'",
    ]);
    const cheHostName = getCheIngressProcess.stdout.replace(/'/g, '');
    const cheUrl = `https://${cheHostName}`;
    core.setOutput('che-url', cheUrl);
  }

  async defineCheTokenOutputValue(): Promise<void> {
    const getIngressProcess = await execa('kubectl', [
      'get',
      'ingress/keycloak',
      '-n',
      'eclipse-che',
      '-o',
      "jsonpath='{.spec.rules[0].host}'",
    ]);
    const keycloakBaseUrl = getIngressProcess.stdout.replace(/'/g, '');
    const keycloakUrl = `https://${keycloakBaseUrl}/auth/realms/che/protocol/openid-connect/token`;
    const useAccessTokenProcess = await execa('curl', [
      '-k',
      '-X',
      'POST',
      keycloakUrl,
      '-H',
      'Content-Type: application/x-www-form-urlencoded',
      '-d',
      'username=admin',
      '-d',
      'password=admin',
      '-d',
      'grant_type=password',
      '-d',
      'client_id=che-public',
    ]);
    const userAccessRaw = useAccessTokenProcess.stdout;
    const userAccessJson = JSON.parse(userAccessRaw);
    const userAccessToken = userAccessJson.access_token;
    core.setOutput('che-token', userAccessToken);
    core.setSecret(userAccessToken);
  }

  async login(): Promise<void> {
    core.info('Performing auth:Login...');
    await execa('chectl', ['auth:login', '-u', 'admin', '-p', 'admin', '--chenamespace=eclipse-che']);
  }
}
