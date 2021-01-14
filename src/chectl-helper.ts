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
import * as path from 'path';

import { inject, injectable } from 'inversify';

import { Configuration } from './configuration';

@injectable()
export class ChectlHelper {
  @inject(Configuration)
  private configuration: Configuration;

  private static readonly CHECTL_SCRIPT_PATH = '/tmp/chectl-install.sh';

  async download(): Promise<void> {
    core.info('Downloading chectl installer...');
    const { stdout } = await execa('curl', ['-sL', 'https://www.eclipse.org/che/chectl/']);

    // write script content
    await fs.writeFile(ChectlHelper.CHECTL_SCRIPT_PATH, stdout);
    core.info('Making it executable...');
    await fs.chmod(ChectlHelper.CHECTL_SCRIPT_PATH, '755');
  }

  async install(): Promise<void> {
    if (this.configuration.skipChectlInstall()) {
      core.info('Skipping chectl installation as specified.');
      return;
    }
    core.info('Installing chectl...');
    // execute installer
    const chectlInstallScriptProcess = execa(ChectlHelper.CHECTL_SCRIPT_PATH, ['--channel=next']);

    if (chectlInstallScriptProcess.stdout) {
      chectlInstallScriptProcess.stdout.pipe(process.stdout);
    }

    await chectlInstallScriptProcess;
  }

  async configure(): Promise<void> {
    core.info('configuring chectl defaults...');
    const home: string = process.env['HOME'] || '';
    if (home === '') {
      core.error('No HOME environment variable found');
      core.setFailed('No HOME environment variable found');
      return;
    }
    const chectlConfigFolderPath = path.resolve(home, '.config', 'chectl');
    await fs.ensureDir(chectlConfigFolderPath);
    const chectlConfigPath = path.join(chectlConfigFolderPath, 'config.json');
    // disable telemetry
    await fs.writeFile(chectlConfigPath, JSON.stringify({ 'segment.telemetry': 'off' }));
  }
}
