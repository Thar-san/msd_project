import { spawn, exec } from 'child_process';
import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { ICodeRunResult } from '@compilo/shared';

export interface ExecutionOptions {
  code: string;
  stdin?: string;
  timeoutMs?: number;
}

interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  spawnError?: string;
  durationMs: number;
}

interface CompiledProgram {
  workDir: string;
  binaryPath: string;
}

export class GoExecutionService {
  private static getGoBinary(): string {
    const configured = config.go.binaryPath;
    if (configured && fsSync.existsSync(configured)) {
      return configured;
    }
    const standardPaths = [
      'C:\\Program Files\\Go\\bin\\go.exe',
      'C:\\Go\\bin\\go.exe',
      path.join(os.homedir(), 'go', 'bin', 'go.exe'),
    ];
    for (const p of standardPaths) {
      if (fsSync.existsSync(p)) return p;
    }
    return configured || 'go';
  }

  /**
   * Compiles and runs a single Go program with the given stdin.
   */
  public static async execute(options: ExecutionOptions): Promise<ICodeRunResult> {
    const { code, stdin = '', timeoutMs = config.go.timeoutMs } = options;
    const [result] = await this.executeWithInputs(code, [stdin], timeoutMs);
    return result;
  }

  /**
   * Compiles the program once, then runs the binary for every stdin input.
   * Used by the grader so each test case does not recompile the code.
   */
  public static async executeWithInputs(
    code: string,
    inputs: string[],
    timeoutMs: number = config.go.timeoutMs
  ): Promise<ICodeRunResult[]> {
    if (!code || typeof code !== 'string') {
      const empty: ICodeRunResult = {
        stdout: '',
        stderr: 'No Go code provided for execution.',
        exitCode: 1,
        executionTimeMs: 0,
        compileError: 'No code provided',
        timedOut: false,
      };
      return inputs.map(() => empty);
    }

    const workDir = path.join(os.tmpdir(), `compilo-go-${uuidv4()}`);

    try {
      const compiled = await this.compile(code, workDir);
      if ('compileError' in compiled) {
        return inputs.map(() => compiled.compileError);
      }

      const results: ICodeRunResult[] = [];
      for (const stdin of inputs) {
        results.push(await this.runBinary(compiled, stdin, timeoutMs));
      }
      return results;
    } catch (err: any) {
      const failure: ICodeRunResult = {
        stdout: '',
        stderr: `Execution workspace setup error: ${err.message}`,
        exitCode: 1,
        executionTimeMs: 0,
        compileError: err.message,
        timedOut: false,
      };
      return inputs.map(() => failure);
    } finally {
      // Ephemeral workspace cleanup
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch {
        // Silently continue if the OS briefly locks the folder
      }
    }
  }

  /** Writes main.go and builds it with `go build`. Build failures are reported as compile errors. */
  private static async compile(
    code: string,
    workDir: string
  ): Promise<CompiledProgram | { compileError: ICodeRunResult }> {
    await fs.mkdir(workDir, { recursive: true });
    await fs.writeFile(path.join(workDir, 'main.go'), code, 'utf-8');

    const binaryName = process.platform === 'win32' ? 'program.exe' : 'program';
    const build = await this.runProcess(
      this.getGoBinary(),
      ['build', '-o', binaryName, 'main.go'],
      workDir,
      '',
      config.go.compileTimeoutMs
    );

    if (build.spawnError) {
      return {
        compileError: {
          stdout: '',
          stderr: `Could not start the Go compiler (${build.spawnError}). Check GO_BINARY_PATH in apps/api/.env.`,
          exitCode: -1,
          executionTimeMs: build.durationMs,
          compileError: build.spawnError,
          timedOut: false,
        },
      };
    }

    if (build.timedOut || build.exitCode !== 0) {
      const message = build.timedOut
        ? `Compilation took longer than ${config.go.compileTimeoutMs}ms.`
        : this.cleanPaths(build.stderr, workDir) || 'Compilation failed.';
      return {
        compileError: {
          stdout: '',
          stderr: message,
          exitCode: build.exitCode || 1,
          executionTimeMs: build.durationMs,
          compileError: message,
          timedOut: false,
        },
      };
    }

    return { workDir, binaryPath: path.join(workDir, binaryName) };
  }

  /** Runs the compiled binary with a time limit. */
  private static async runBinary(
    program: CompiledProgram,
    stdin: string,
    timeoutMs: number
  ): Promise<ICodeRunResult> {
    const run = await this.runProcess(program.binaryPath, [], program.workDir, stdin, timeoutMs);
    const stderr = this.cleanPaths(run.stderr, program.workDir);

    let runtimeError: string | undefined;
    if (run.timedOut) {
      runtimeError = `Time Limit Exceeded: Execution took longer than ${timeoutMs}ms limit.`;
    } else if (run.spawnError) {
      runtimeError = run.spawnError;
    } else if (run.exitCode !== 0) {
      runtimeError = stderr || `Process exited with error code ${run.exitCode}`;
    }

    return {
      stdout: run.stdout,
      stderr,
      exitCode: run.timedOut ? 124 : run.exitCode,
      executionTimeMs: run.durationMs,
      runtimeError,
      timedOut: run.timedOut,
    };
  }

  /** Spawns a process, pipes stdin, buffers output up to the configured limit and kills it on timeout. */
  private static runProcess(
    command: string,
    args: string[],
    cwd: string,
    stdin: string,
    timeoutMs: number
  ): Promise<ProcessResult> {
    const startTime = Date.now();
    const maxBytes = config.go.maxOutputBytes;

    return new Promise<ProcessResult>((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let finished = false;

      const child = spawn(command, args, { cwd, windowsHide: true });

      const timer = setTimeout(() => {
        if (finished) return;
        timedOut = true;
        if (process.platform === 'win32' && child.pid) {
          exec(`taskkill /pid ${child.pid} /T /F`, () => {});
        } else {
          child.kill('SIGKILL');
        }
      }, timeoutMs);

      const append = (current: string, chunk: Buffer, label: string) => {
        if (current.length >= maxBytes) return current;
        const text = chunk.toString();
        if (current.length + text.length <= maxBytes) return current + text;
        return current + text.slice(0, maxBytes - current.length) + `\n[${label} truncated...]`;
      };

      child.stdout.on('data', (chunk: Buffer) => {
        stdout = append(stdout, chunk, 'Output');
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr = append(stderr, chunk, 'Error output');
      });

      // Ignore EPIPE when the program exits without reading stdin
      child.stdin.on('error', () => {});
      child.stdin.end(stdin || '');

      child.on('error', (err) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve({ stdout: '', stderr: '', exitCode: -1, timedOut: false, spawnError: err.message, durationMs: Date.now() - startTime });
      });

      child.on('close', (code) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code ?? -1, timedOut, durationMs: Date.now() - startTime });
      });
    });
  }

  /** Removes temporary folder paths from compiler / runtime messages. */
  private static cleanPaths(text: string, workDir: string): string {
    const escape = (p: string) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Go prints Windows paths with either separator, so strip both spellings
    const variants = [workDir, workDir.replace(/\\/g, '/')];
    let cleaned = text;
    for (const dir of variants) {
      cleaned = cleaned
        .replace(new RegExp(escape(dir) + '[\\\\/]', 'g'), '')
        .replace(new RegExp(escape(dir), 'g'), '');
    }
    return cleaned.replace(/^# command-line-arguments\r?\n/m, '');
  }
}
