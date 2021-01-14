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

import { CheHelper } from '../src/che-helper';
import { ChectlHelper } from '../src/chectl-helper';
import { Configuration } from '../src/configuration';
import { Container } from 'inversify';
import { InstallEclipseChe } from '../src/install-eclipse-che';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Test Logic InstallEclipseChe', () => {
  let container: Container;
  let configuration: Configuration;
  let cheHelper: CheHelper;

  let cheCtlHelper: any;

  beforeEach(() => {
    container = new Container();
    container.bind(InstallEclipseChe).toSelf().inSingletonScope();

    cheHelper = {
      serverDeploy: jest.fn(),
      defineCheTokenOutputValue: jest.fn(),
      defineCheUrlOutputValue: jest.fn(),
      login: jest.fn(),
      getCustomResource: jest.fn(),
    } as any;
    container.bind(CheHelper).toConstantValue(cheHelper);

    cheCtlHelper = {
      download: jest.fn(),
      configure: jest.fn(),
      install: jest.fn(),
    } as any;
    container.bind(ChectlHelper).toConstantValue(cheCtlHelper);

    configuration = {} as any;
    container.bind(Configuration).toConstantValue(configuration);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('basic', async () => {
    const installEclipseCheLogic = container.get(InstallEclipseChe);

    await installEclipseCheLogic.execute();

    expect(cheHelper.serverDeploy).toBeCalled();
    expect(cheHelper.defineCheTokenOutputValue).toBeCalled();
    expect(cheHelper.defineCheUrlOutputValue).toBeCalled();
    expect(cheHelper.serverDeploy).toBeCalled();
    expect(cheHelper.login).toBeCalled();

    expect(cheCtlHelper.download).toBeCalled();
    expect(cheCtlHelper.install).toBeCalled();
    expect(cheCtlHelper.configure).toBeCalled();
  });
});
