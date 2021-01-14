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

import { Container } from 'inversify';
import { InversifyBinding } from '../src/inversify-binding';
import { Main } from '../src/main';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Test Main with stubs', () => {
  const originalConsoleError = console.error;
  const mockedConsoleError = jest.fn();
  const installEclipseCheExecuteMethod = jest.fn();
  const installEclipseCheMock = {
    execute: installEclipseCheExecuteMethod as any,
  };
  let container: Container;

  beforeEach(() => {
    container = {
      get: jest.fn().mockReturnValue(installEclipseCheMock),
    } as any;
    const spyInitBindings = jest.spyOn(InversifyBinding.prototype, 'initBindings');
    spyInitBindings.mockImplementation(() => Promise.resolve(container));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  beforeEach(() => (console.error = mockedConsoleError));
  afterEach(() => (console.error = originalConsoleError));

  test('basic', async () => {
    const main = new Main();
    const returnCode = await main.start();
    expect(mockedConsoleError).toBeCalledTimes(0);
    expect(returnCode).toBeTruthy();
    expect(installEclipseCheExecuteMethod).toBeCalled();
  });

  test('configuration', async () => {
    const CHE_INSTANCE = 'https://foo.bar';
    (core as any).__setInput('che-instance', CHE_INSTANCE);

    const PLUGIN_REGISTRY_IMAGE = 'my-plugin-registry-image:tag';
    (core as any).__setInput(Main.PLUGIN_REGISTRY_IMAGE, PLUGIN_REGISTRY_IMAGE);
    const DEVFILE_REGISTRY_IMAGE = 'my-devfile-registry-image:tag';
    (core as any).__setInput(Main.DEVFILE_REGISTRY_IMAGE, DEVFILE_REGISTRY_IMAGE);

    const CHE_SERVER_IMAGE = 'my-che-server-image:tag';
    (core as any).__setInput(Main.CHE_SERVER_IMAGE, CHE_SERVER_IMAGE);

    const SKIP_CHECTL_INSTALL = 'true';
    (core as any).__setInput(Main.SKIP_CHECTL_INSTALL, SKIP_CHECTL_INSTALL);

    const main = new Main();
    const configuration = await main.initConfiguration();
    expect(configuration.pluginRegistryImage()).toBe(PLUGIN_REGISTRY_IMAGE);
    expect(configuration.devfileRegistryImage()).toBe(DEVFILE_REGISTRY_IMAGE);
    expect(configuration.cheServerImage()).toBe(CHE_SERVER_IMAGE);
    expect(configuration.skipChectlInstall()).toBe(true);
  });

  test('success if required parameter is provided', async () => {
    const CHE_INSTANCE = 'https://foo.bar';
    (core as any).__setInput('che-instance', CHE_INSTANCE);

    const main = new Main();
    const returnCode = await main.start();

    expect(returnCode).toBeTruthy();
    expect(installEclipseCheExecuteMethod).toBeCalled();
    expect(mockedConsoleError).toBeCalledTimes(0);
  });

  test('error', async () => {
    jest.spyOn(InversifyBinding.prototype, 'initBindings').mockImplementation(() => {
      throw new Error('Dummy error');
    });
    const main = new Main();
    const returnCode = await main.start();
    expect(mockedConsoleError).toBeCalled();
    expect(returnCode).toBeFalsy();
    expect(installEclipseCheExecuteMethod).toBeCalledTimes(0);
  });
});
