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

import { inject, injectable } from 'inversify';

import { CheHelper } from './che-helper';
import { ChectlHelper } from './chectl-helper';

@injectable()
export class InstallEclipseChe {
  @inject(CheHelper)
  private cheHelper: CheHelper;

  @inject(ChectlHelper)
  private chectlHelper: ChectlHelper;

  public async execute(): Promise<void> {
    core.info('Chectl [download]...');
    await this.chectlHelper.download();

    core.info('Chectl [configure]...');
    await this.chectlHelper.configure();

    core.info('Chectl [install]...');
    await this.chectlHelper.install();

    core.info('Eclipse Che [serverDeploy]...');
    await this.cheHelper.serverDeploy();

    core.info('Eclipse Che [sets che-url]...');
    await this.cheHelper.defineCheUrlOutputValue();

    core.info('Eclipse Che [sets che-token]...');
    await this.cheHelper.defineCheTokenOutputValue();

    core.info('Eclipse Che [login]...');
    await this.cheHelper.login();
  }
}
