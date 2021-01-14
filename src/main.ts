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

import { Configuration } from './configuration';
import { InstallEclipseChe } from './install-eclipse-che';
import { InversifyBinding } from './inversify-binding';

export class Main {
  public static readonly PLUGIN_REGISTRY_IMAGE: string = 'plugin-registry-image';
  public static readonly DEVFILE_REGISTRY_IMAGE: string = 'devfile-registry-image';
  public static readonly CHE_SERVER_IMAGE: string = 'che-server-image';
  public static readonly SKIP_CHECTL_INSTALL: string = 'skip-chectl-install';

  async initConfiguration(): Promise<Configuration> {
    const pluginRegistryImage = core.getInput(Main.PLUGIN_REGISTRY_IMAGE);
    const devfileRegistryImage = core.getInput(Main.DEVFILE_REGISTRY_IMAGE);
    const cheServerImage = core.getInput(Main.CHE_SERVER_IMAGE);
    const skipChectlInstall = 'true' === core.getInput(Main.SKIP_CHECTL_INSTALL);

    // configuration
    return {
      cheServerImage: () => cheServerImage,
      pluginRegistryImage: () => pluginRegistryImage,
      devfileRegistryImage: () => devfileRegistryImage,
      skipChectlInstall: () => skipChectlInstall,
    };
  }

  protected async doStart(): Promise<void> {
    const configuration = await this.initConfiguration();
    const inversifyBinbding = new InversifyBinding(configuration);
    const container = await inversifyBinbding.initBindings();
    const installEclipseChe = container.get(InstallEclipseChe);
    await installEclipseChe.execute();
  }

  async start(): Promise<boolean> {
    try {
      await this.doStart();
      return true;
    } catch (error) {
      console.error('stack=' + error.stack);
      console.error('Unable to start', error);
      return false;
    }
  }
}
