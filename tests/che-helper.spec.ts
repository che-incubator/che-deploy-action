/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import 'reflect-metadata';

import * as core from '@actions/core';
import * as execa from 'execa';
import * as fs from 'fs-extra';
import * as jsyaml from 'js-yaml';

import { CheHelper } from '../src/che-helper';
import { Configuration } from '../src/configuration';
import { Container } from 'inversify';

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('execa');

describe('Test SetupCheHelper', () => {
  let container: Container;
  const pluginRegistryImageMock = jest.fn();
  const devfileRegistryImageMock = jest.fn();
  const cheServerImageMock = jest.fn();
  let configuration: any;
  let cheHelper: CheHelper;

  beforeEach(() => {
    container = new Container();
    configuration = {
      pluginRegistryImage: pluginRegistryImageMock,
      devfileRegistryImage: devfileRegistryImageMock,
      cheServerImage: cheServerImageMock,
    };
    container.bind(Configuration).toConstantValue(configuration);

    container.bind(CheHelper).toSelf().inSingletonScope();
    cheHelper = container.get(CheHelper);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  test('Check default custom resource', async () => {
    const customResource = cheHelper.getCustomResource();

    expect(customResource).toBe(`spec:
  auth:
    updateAdminPassword: false
  server:
    customCheProperties:
      CHE_WORKSPACE_SIDECAR_IMAGE__PULL__POLICY: IfNotPresent
      CHE_WORKSPACE_PLUGIN__BROKER_PULL__POLICY: IfNotPresent
      CHE_INFRA_KUBERNETES_PVC_JOBS_IMAGE_PULL__POLICY: IfNotPresent
`);
  });

  test('Check custom resource with plugin registry', async () => {
    const myCustomPluginRegistryImage = 'my-image:tag';
    pluginRegistryImageMock.mockReturnValue(myCustomPluginRegistryImage);

    const customResource = cheHelper.getCustomResource();

    const yaml: any = jsyaml.load(customResource);
    expect(yaml.spec.server.pluginRegistryImage).toBe(myCustomPluginRegistryImage);
  });

  test('Check custom resource with devfile registry', async () => {
    const myCustomDevfileRegistryImage = 'my-image:tag';
    devfileRegistryImageMock.mockReturnValue(myCustomDevfileRegistryImage);

    const customResource = cheHelper.getCustomResource();

    const yaml: any = jsyaml.load(customResource);
    expect(yaml.spec.server.devfileRegistryImage).toBe(myCustomDevfileRegistryImage);
  });

  test('Check custom resource with che server image', async () => {
    const myCustomCheServerImage = 'my-image:tag';
    cheServerImageMock.mockReturnValue(myCustomCheServerImage);

    const customResource = cheHelper.getCustomResource();

    const yaml: any = jsyaml.load(customResource);
    expect(yaml.spec.server.cheImage).toBe('my-image');
    expect(yaml.spec.server.cheImageTag).toBe('tag');
  });

  test('Check custom resource with invalid che server image', async () => {
    const myCustomCheServerImage = 'my-image';
    cheServerImageMock.mockReturnValue(myCustomCheServerImage);

    expect(() => cheHelper.getCustomResource()).toThrow(
      'che server image needs to be in format: [server/]imageName:imageTag. Found my-image'
    );
  });

  test('defineCheUrlOutputValue', async () => {
    const stdout = '123.123.123.123';

    (execa as any).mockResolvedValue({ exitCode: 0, stdout });
    await cheHelper.defineCheUrlOutputValue();

    expect((execa as any).mock.calls[0][0]).toBe('kubectl');
    expect((execa as any).mock.calls[0][1][0]).toBe('get');
    expect((execa as any).mock.calls[0][1][1]).toBe('ingress');

    expect(core.info).toBeCalled();
    expect(core.setOutput).toBeCalled();

    expect((core.info as any).mock.calls[0][0]).toContain('che-url');
    expect((core.setOutput as any).mock.calls[0][0]).toBe('che-url');
    expect((core.setOutput as any).mock.calls[0][1]).toBe('https://123.123.123.123');
  });

  test('defineCheTokenOutputValue', async () => {
    const keyCloakUrl = 'my-keycloak.url';
    ((execa as any) as jest.Mock).mockResolvedValueOnce({ exitCode: 0, stdout: keyCloakUrl });

    const keyCloakStdout = {
      access_token: 'my-token',
    };
    ((execa as any) as jest.Mock).mockResolvedValueOnce({ exitCode: 0, stdout: JSON.stringify(keyCloakStdout) });

    await cheHelper.defineCheTokenOutputValue();

    expect((execa as any).mock.calls[0][0]).toBe('kubectl');
    expect((execa as any).mock.calls[0][1][0]).toBe('get');
    expect((execa as any).mock.calls[0][1][1]).toBe('ingress/keycloak');

    expect((execa as any).mock.calls[1][0]).toBe('curl');
    // keycloak url should be from the first call
    expect((execa as any).mock.calls[1][1][3]).toBe(
      `https://${keyCloakUrl}/auth/realms/che/protocol/openid-connect/token`
    );
  });

  test('login', async () => {
    ((execa as any) as jest.Mock).mockResolvedValueOnce({ exitCode: 0, stdout: undefined });
    await cheHelper.login();

    expect(core.info).toBeCalled();

    expect((core.info as any).mock.calls[0][0]).toContain('Performing auth:Login');

    expect((execa as any).mock.calls[0][0]).toBe('chectl');
    expect((execa as any).mock.calls[0][1][0]).toBe('auth:login');
  });

  test('server deploy no stdout/stderr', async () => {
    const writeFileSpy = jest.spyOn(fs, 'writeFile');

    writeFileSpy.mockReturnValue();

    (execa as any).mockResolvedValue({ exitCode: 0, stdout: undefined });
    await cheHelper.serverDeploy();

    expect(writeFileSpy.mock.calls[0][0]).toBe('/tmp/custom-resource-patch.yaml');
    expect(writeFileSpy.mock.calls[0][1]).toContain('customCheProperties');

    expect((execa as any).mock.calls[0][0]).toBe('chectl');
    expect((execa as any).mock.calls[0][1][0]).toBe('server:deploy');
  });

  test('server deploy with stdout/stderr', async () => {
    const writeFileSpy = jest.spyOn(fs, 'writeFile');

    writeFileSpy.mockReturnValue();
    const output = { pipe: jest.fn() };
    const err = { pipe: jest.fn() };

    (execa as any).mockReturnValue({ exitCode: 0, stdout: output, stderr: err });
    await cheHelper.serverDeploy();

    expect(writeFileSpy.mock.calls[0][0]).toBe('/tmp/custom-resource-patch.yaml');
    expect(writeFileSpy.mock.calls[0][1]).toContain('customCheProperties');

    expect((execa as any).mock.calls[0][0]).toBe('chectl');
    expect((execa as any).mock.calls[0][1][0]).toBe('server:deploy');
  });
});
