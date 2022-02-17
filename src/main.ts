/**********************************************************************
 * Copyright (c) 2021-2022 Red Hat, Inc.
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
import { PostAction } from './post-action';

export class Main {
  public static readonly PLUGIN_REGISTRY_IMAGE: string = 'plugin-registry-image';
  public static readonly DEVFILE_REGISTRY_IMAGE: string = 'devfile-registry-image';
  public static readonly CHE_SERVER_IMAGE: string = 'che-server-image';
  public static readonly SKIP_CHECTL_INSTALL: string = 'skip-chectl-install';
  public static readonly CHECTL_CHANNEL: string = 'chectl-channel';
  public static readonly ACTION_STATE: string = 'eclipse-che-state';
  public static readonly ACTION_STATE_MAIN: string = 'MAIN';
  public static readonly ACTION_STATE_POST: string = 'POST';

  async initConfiguration(): Promise<Configuration> {
    const pluginRegistryImage = core.getInput(Main.PLUGIN_REGISTRY_IMAGE);
    const devfileRegistryImage = core.getInput(Main.DEVFILE_REGISTRY_IMAGE);
    const cheServerImage = core.getInput(Main.CHE_SERVER_IMAGE);
    const chectlChannel = core.getInput(Main.CHECTL_CHANNEL);
    const skipChectlInstall = 'true' === core.getInput(Main.SKIP_CHECTL_INSTALL);

    // custom job name ?
    const jobNameSuffix = process.env['JOB_NAME_SUFFIX'] || '';

    // configuration
    return {
      cheServerImage: () => cheServerImage,
      pluginRegistryImage: () => pluginRegistryImage,
      devfileRegistryImage: () => devfileRegistryImage,
      skipChectlInstall: () => skipChectlInstall,
      chectlChannel: () => chectlChannel,
      jobNameSuffix: () => jobNameSuffix,
    };
  }

  isPostAction(): boolean {
    const previousState = core.getState(Main.ACTION_STATE);
    if (previousState !== Main.ACTION_STATE_POST) {
      core.saveState(Main.ACTION_STATE, Main.ACTION_STATE_POST);
      return false;
    }
    return true;
  }

  protected async doStart(): Promise<void> {
    const configuration = await this.initConfiguration();
    const inversifyBinbding = new InversifyBinding(configuration);
    const container = await inversifyBinbding.initBindings();
    if (this.isPostAction()) {
      const postAction = container.get(PostAction);
      await postAction.execute();
    } else {
      const installEclipseChe = container.get(InstallEclipseChe);
      await installEclipseChe.execute();
    }
  }

  async start(): Promise<boolean> {
    try {
      await this.doStart();
      return true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('stack=' + error.stack);
      console.error('Unable to start', error);
      return false;
    }
  }
}
