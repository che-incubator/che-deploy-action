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

import * as artifact from '@actions/artifact';
import * as core from '@actions/core';
import * as execa from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';

import { Configuration } from '../src/configuration';
import { Container } from 'inversify';
import { PostActionScriptRunner } from '../src/post-action-script-runner';

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('execa');

describe('Test PostActionScriptRunner', () => {
  let container: Container;
  let postActionScriptRunner: PostActionScriptRunner;
  let configuration: any;
  const jobNameSuffixMethod = jest.fn();

  beforeEach(() => {
    container = new Container();
    configuration = {
      jobNameSuffix: jobNameSuffixMethod,
    };
    container.bind(Configuration).toConstantValue(configuration);

    container.bind(PostActionScriptRunner).toSelf().inSingletonScope();
    postActionScriptRunner = container.get(PostActionScriptRunner);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  test('collect', async () => {
    const output = { pipe: jest.fn() };

    (execa as any).mockReturnValue({ exitCode: 0, stdout: output, stderr: output });

    const fsWriteSpy = jest.spyOn(fs, 'writeFile');
    const artifactSpy = jest.spyOn(artifact, 'create');
    const artifactClient = { uploadArtifact: jest.fn() } as any;
    artifactSpy.mockReturnValue(artifactClient);
    fsWriteSpy.mockReturnValue();
    jobNameSuffixMethod.mockReturnValue('suffix');

    const getFilesFromDirectorySpy = jest.spyOn(postActionScriptRunner, 'getFilesFromDirectory');
    getFilesFromDirectorySpy.mockImplementation((_directory: string, files: string[]) => {
      files.push('file1');
      files.push('file2');
    });

    await postActionScriptRunner.run();
    // core.info
    expect(core.info).toBeCalled();
    expect((core.info as any).mock.calls[0][0]).toContain('che-logs');

    expect((execa as any).mock.calls[0][0]).toContain('src/post-action-script.sh');
    expect((execa as any).mock.calls[0][1]).toStrictEqual([]);

    expect(artifactClient.uploadArtifact).toBeCalledWith(
      'Eclipse Che Logs suffix',
      ['file1', 'file2'],
      expect.stringContaining('che-deploy-action'),
      {
        continueOnError: true,
      }
    );
  });

  test('collect no output', async () => {
    (execa as any).mockReturnValue({ exitCode: 0, stdout: undefined, stderr: undefined });

    const fsWriteSpy = jest.spyOn(fs, 'writeFile');
    const artifactSpy = jest.spyOn(artifact, 'create');
    const artifactClient = { uploadArtifact: jest.fn() } as any;
    artifactSpy.mockReturnValue(artifactClient);
    fsWriteSpy.mockReturnValue();
    jobNameSuffixMethod.mockReturnValue('suffix');

    const getFilesFromDirectorySpy = jest.spyOn(postActionScriptRunner, 'getFilesFromDirectory');
    getFilesFromDirectorySpy.mockImplementation((_directory: string, files: string[]) => {
      files.push('file1');
      files.push('file2');
    });

    await postActionScriptRunner.run();
    // core.info
    expect(core.info).toBeCalled();
    expect((core.info as any).mock.calls[0][0]).toContain('che-logs');

    expect((execa as any).mock.calls[0][0]).toContain('src/post-action-script.sh');
    expect((execa as any).mock.calls[0][1]).toStrictEqual([]);

    expect(artifactClient.uploadArtifact).toBeCalledWith(
      'Eclipse Che Logs suffix',
      ['file1', 'file2'],
      expect.stringContaining('che-deploy-action'),
      {
        continueOnError: true,
      }
    );
  });

  test('getFilesFromDirectory', async () => {
    const files: string[] = [];

    postActionScriptRunner.getFilesFromDirectory(path.resolve(__dirname, '..'), files);
    expect(files.length).toBeGreaterThan(2);
  });
});
