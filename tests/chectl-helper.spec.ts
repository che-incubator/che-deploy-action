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

import { ChectlHelper } from '../src/chectl-helper';
import { Configuration } from '../src/configuration';
import { Container } from 'inversify';

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('execa');

describe('Test ChectlHelper', () => {
  let container: Container;

  const originalProcessEnv = process.env;
  let configuration: any;
  const skipChectlInstallMethod = jest.fn();

  beforeEach(() => {
    container = new Container();
    process.env = {};
    configuration = {
      skipChectlInstall: skipChectlInstallMethod,
    };
    container.bind(Configuration).toConstantValue(configuration);
    container.bind(ChectlHelper).toSelf().inSingletonScope();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    process.env = originalProcessEnv;
  });

  test('download', async () => {
    const fakeContent = 'fake-script';

    const chectlHelper = container.get(ChectlHelper);
    const chmodSpy = jest.spyOn(fs, 'chmod');
    const writeFileSpy = jest.spyOn(fs, 'writeFile');

    writeFileSpy.mockReturnValue();
    chmodSpy.mockResolvedValue();

    (execa as any).mockResolvedValue({ exitCode: 0, stdout: fakeContent });

    await chectlHelper.download();

    const execaCall = ((execa as any) as jest.Mock).mock.calls[0];
    expect(execaCall[0]).toBe('curl');
    expect(execaCall[1]).toStrictEqual(['-sL', 'https://www.eclipse.org/che/chectl/']);

    expect(writeFileSpy).toBeCalledTimes(1);
    const writeFileCall = writeFileSpy.mock.calls[0];
    expect(writeFileCall[0]).toBe('/tmp/chectl-install.sh');
    expect(writeFileCall[1]).toBe(fakeContent);

    expect(chmodSpy).toBeCalledTimes(1);
    const chmodCall = chmodSpy.mock.calls[0];
    expect(chmodCall[0]).toBe('/tmp/chectl-install.sh');
    expect(chmodCall[1]).toBe('755');
  });

  test('install', async () => {
    const chectlHelper = container.get(ChectlHelper);

    const output = { pipe: jest.fn() };
    (execa as any).mockReturnValue({ exitCode: 0, stdout: output });

    await chectlHelper.install();

    const execaCall = ((execa as any) as jest.Mock).mock.calls[0];
    expect(execaCall[0]).toBe('/tmp/chectl-install.sh');
    expect(execaCall[1]).toStrictEqual(['--channel=next']);

    expect(output.pipe).toBeCalled();
  });

  test('install if skipped', async () => {
    const chectlHelper = container.get(ChectlHelper);

    skipChectlInstallMethod.mockResolvedValue(true);
    await chectlHelper.install();

    const execaCalls = ((execa as any) as jest.Mock).mock.calls;
    expect(execaCalls.length).toBe(0);

    expect(core.info).toBeCalled();
    const infoCall = (core.info as jest.Mock).mock.calls[0];
    expect(infoCall[0]).toContain('Skipping chectl installation');
  });

  test('install without stdout', async () => {
    const chectlHelper = container.get(ChectlHelper);

    (execa as any).mockReturnValue({ exitCode: 0, stdout: undefined });

    await chectlHelper.install();

    const execaCall = ((execa as any) as jest.Mock).mock.calls[0];
    expect(execaCall[0]).toBe('/tmp/chectl-install.sh');
    expect(execaCall[1]).toStrictEqual(['--channel=next']);
  });

  test('configure', async () => {
    const chectlHelper = container.get(ChectlHelper);

    process.env.HOME = '/foo';

    const ensureDirSpy = jest.spyOn(fs, 'ensureDir');
    const writeFileSpy = jest.spyOn(fs, 'writeFile');

    writeFileSpy.mockReturnValue();
    ensureDirSpy.mockReturnValue();

    await chectlHelper.configure();

    expect(writeFileSpy).toBeCalledTimes(1);
    const writeFileCall = writeFileSpy.mock.calls[0];
    expect(writeFileCall[0]).toBe('/foo/.config/chectl/config.json');
    expect(writeFileCall[1]).toBe('{"segment.telemetry":"off"}');

    expect(ensureDirSpy).toBeCalledTimes(1);
    const ensureDirCall = ensureDirSpy.mock.calls[0];
    expect(ensureDirCall[0]).toBe('/foo/.config/chectl');
  });

  test('configure without home', async () => {
    const chectlHelper = container.get(ChectlHelper);

    const ensureDirSpy = jest.spyOn(fs, 'ensureDir');
    const writeFileSpy = jest.spyOn(fs, 'writeFile');

    writeFileSpy.mockReturnValue();
    ensureDirSpy.mockReturnValue();

    await chectlHelper.configure();

    expect(writeFileSpy).toBeCalledTimes(0);
    expect(ensureDirSpy).toBeCalledTimes(0);
    expect(core.setFailed).toBeCalled();
    const setFailedCall = (core.setFailed as jest.Mock).mock.calls[0];
    expect(setFailedCall[0]).toContain('No HOME environment variable');

    expect(core.error).toBeCalled();
    const errorCall = (core.error as jest.Mock).mock.calls[0];
    expect(errorCall[0]).toContain('No HOME environment variable');
  });
});
