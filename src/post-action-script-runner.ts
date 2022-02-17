/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import * as artifact from '@actions/artifact';
import * as core from '@actions/core';
import * as execa from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';

import { inject, injectable } from 'inversify';

import { Configuration } from './configuration';

@injectable()
export class PostActionScriptRunner {
  @inject(Configuration)
  private configuration: Configuration;

  getFilesFromDirectory(directory: string, files: string[]): void {
    const filesInDirectory = fs.readdirSync(directory);
    for (const file of filesInDirectory) {
      const absolute = path.join(directory, file);
      if (fs.statSync(absolute).isDirectory()) {
        this.getFilesFromDirectory(absolute, files);
      } else {
        files.push(absolute);
      }
    }
  }

  async run(): Promise<void> {
    // Execute the commands to grab stuff
    core.info('Execute the shell script');
    const actionScriptProcess = execa('__dirname/post-action-script.sh', []);
    if (actionScriptProcess.stdout) {
      actionScriptProcess.stdout.pipe(process.stdout);
    }
    if (actionScriptProcess.stderr) {
      actionScriptProcess.stderr.pipe(process.stderr);
    }
    await actionScriptProcess;

    // add logs as artifact
    const artifactClient = artifact.create();
    const artifactName = `Eclipse Che Logs ${this.configuration.jobNameSuffix()}`;

    const logsPath = path.resolve(__dirname, 'che-logs');
    core.info('Storing the folder' + logsPath);
    const files: string[] = [];
    this.getFilesFromDirectory(logsPath, files);
    const rootDirectory = path.dirname(logsPath);
    const options = {
      continueOnError: true,
    };

    // upload log
    await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options);
  }
}
