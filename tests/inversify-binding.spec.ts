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
import { InversifyBinding } from '../src/inversify-binding';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Test InversifyBinding', () => {
  test('bindings', async () => {
    const chePluginRegistryImage = 'https://foo.com';

    const predefinedConfiguration = {
      pluginRegistryImage: () => chePluginRegistryImage,
    } as any;
    const inversifyBinding = new InversifyBinding(predefinedConfiguration);
    const container: Container = await inversifyBinding.initBindings();

    expect(container.get(CheHelper)).toBeDefined();
    expect(container.get(ChectlHelper)).toBeDefined();

    // config
    const configuration: Configuration = container.get(Configuration);
    expect(configuration).toBeDefined();
    expect(configuration.pluginRegistryImage()).toEqual(chePluginRegistryImage);

    const installEclipseChe = container.get(InstallEclipseChe);
    expect(installEclipseChe).toBeDefined();
  });
});
