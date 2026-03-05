/**
 * Unit tests for Secrets Helper
 */

import { 
  maskSecret, 
  getSecret, 
  loadSecretsFromFile,
  loadEnvFile,
  SecretsManager,
  createMaskedLogger
} from './secrets';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('maskSecret', () => {
  it('should return [undefined] for undefined value', () => {
    expect(maskSecret(undefined)).toBe('[undefined]');
  });

  it('should return [undefined] for null value', () => {
    expect(maskSecret(null)).toBe('[undefined]');
  });

  it('should mask entire string if shorter than visibleChars', () => {
    expect(maskSecret('abc')).toBe('***');
    expect(maskSecret('ab')).toBe('**');
  });

  it('should show first few characters and mask the rest', () => {
    expect(maskSecret('secret-key-12345')).toBe('secr************');
    expect(maskSecret('sk-abcdefghijklmnop')).toBe('sk-a***************');
  });

  it('should respect custom visibleChars', () => {
    expect(maskSecret('my-secret-key', 2)).toBe('my***********');
    expect(maskSecret('my-secret-key', 10)).toBe('my-secret-***');
  });
});

describe('getSecret', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return undefined for missing env var when not required', () => {
    delete process.env.TEST_SECRET;
    expect(getSecret('TEST_SECRET')).toBeUndefined();
  });

  it('should return value for existing env var', () => {
    process.env.TEST_SECRET = 'my-secret-value';
    expect(getSecret('TEST_SECRET')).toBe('my-secret-value');
  });

  it('should throw for missing required secret', () => {
    delete process.env.REQUIRED_SECRET;
    expect(() => getSecret('REQUIRED_SECRET', true)).toThrow(
      'Required secret REQUIRED_SECRET is not set'
    );
  });

  it('should return value for existing required secret', () => {
    process.env.REQUIRED_SECRET = 'required-value';
    expect(getSecret('REQUIRED_SECRET', true)).toBe('required-value');
  });
});

describe('loadSecretsFromFile', () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return empty object for non-existent file', () => {
    expect(loadSecretsFromFile('/non/existent/file.env')).toEqual({});
  });

  it('should load secrets from file', () => {
    tempFile = path.join(tempDir, '.env');
    fs.writeFileSync(tempFile, `API_KEY=secret123
DATABASE_URL=postgres://localhost:5432/db
# This is a comment
EMPTY_VAR=
QUOTED_VAR="quoted-value"
SINGLE_QUOTED='single-quoted'`);
    
    const secrets = loadSecretsFromFile(tempFile);
    
    expect(secrets.API_KEY).toBe('secret123');
    expect(secrets.DATABASE_URL).toBe('postgres://localhost:5432/db');
    expect(secrets.EMPTY_VAR).toBe('');
    expect(secrets.QUOTED_VAR).toBe('quoted-value');
    expect(secrets.SINGLE_QUOTED).toBe('single-quoted');
  });

  it('should set secrets in process.env', () => {
    tempFile = path.join(tempDir, '.env');
    fs.writeFileSync(tempFile, `TEST_LOADED_SECRET=loaded-value`);
    
    loadSecretsFromFile(tempFile);
    
    expect(process.env.TEST_LOADED_SECRET).toBe('loaded-value');
  });

  it('should skip comments and empty lines', () => {
    tempFile = path.join(tempDir, '.env');
    fs.writeFileSync(tempFile, `# Comment line
ANOTHER_COMMENT=#not-a-comment
KEY_WITHOUT_VALUE=
NORMAL_KEY=normal-value`);
    
    const secrets = loadSecretsFromFile(tempFile);
    
    expect(secrets.ANOTHER_COMMENT).toBe('#not-a-comment');
    expect(secrets.KEY_WITHOUT_VALUE).toBe('');
    expect(secrets.NORMAL_KEY).toBe('normal-value');
  });
});

describe('loadEnvFile', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should load from .env by default', () => {
    const envFile = path.join(tempDir, '.env');
    fs.writeFileSync(envFile, 'DEFAULT_KEY=default-value');
    
    const secrets = loadEnvFile(tempDir);
    
    expect(secrets.DEFAULT_KEY).toBe('default-value');
  });

  it('should load from custom filename', () => {
    const envFile = path.join(tempDir, 'secrets.dev');
    fs.writeFileSync(envFile, 'CUSTOM_KEY=custom-value');
    
    const secrets = loadEnvFile(tempDir, 'secrets.dev');
    
    expect(secrets.CUSTOM_KEY).toBe('custom-value');
  });
});

describe('SecretsManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should add secrets from environment variables', () => {
    process.env.MY_API_KEY = 'api-key-value';
    
    const manager = new SecretsManager();
    manager.addFromEnv('apiKey', 'MY_API_KEY');
    
    expect(manager.get('apiKey')).toBe('api-key-value');
    expect(manager.has('apiKey')).toBe(true);
  });

  it('should return undefined for missing optional secrets', () => {
    delete process.env.MISSING_KEY;
    
    const manager = new SecretsManager();
    manager.addFromEnv('missing', 'MISSING_KEY', false);
    
    expect(manager.get('missing')).toBeUndefined();
    expect(manager.has('missing')).toBe(false);
  });

  it('should throw for missing required secrets', () => {
    delete process.env.REQUIRED_KEY;
    
    const manager = new SecretsManager();
    manager.addFromEnv('required', 'REQUIRED_KEY', true);
    
    expect(manager.get('required')).toBeUndefined();
    // getRequired should throw for missing required secrets
    expect(() => manager.getRequired('required')).toThrow(
      'Required secret required is not loaded'
    );
  });

  it('should get required secret or throw', () => {
    process.env.REQUIRED_KEY = 'required-value';
    
    const manager = new SecretsManager();
    manager.addFromEnv('required', 'REQUIRED_KEY', true);
    
    expect(manager.getRequired('required')).toBe('required-value');
    expect(() => manager.getRequired('nonexistent')).toThrow(
      'Required secret nonexistent is not loaded'
    );
  });

  it('should return masked secrets', () => {
    process.env.MY_SECRET = 'my-secret-value';
    
    const manager = new SecretsManager();
    manager.addFromEnv('secret', 'MY_SECRET');
    
    expect(manager.getMasked('secret')).toBe('my-s***********');
  });

  it('should list all secret names', () => {
    process.env.KEY1 = 'val1';
    process.env.KEY2 = 'val2';
    
    const manager = new SecretsManager();
    manager.addFromEnv('key1', 'KEY1');
    manager.addFromEnv('key2', 'KEY2');
    
    expect(manager.listSecrets()).toEqual(['key1', 'key2']);
  });

  it('should track secret sources', () => {
    process.env.SOURCE_KEY = 'source-value';
    
    const manager = new SecretsManager();
    manager.addFromEnv('source', 'SOURCE_KEY');
    
    expect(manager.getSource('source')).toBe('env:SOURCE_KEY');
  });

  it('should return debug info with masked values', () => {
    process.env.DEBUG_KEY = 'debug-secret';
    
    const manager = new SecretsManager();
    manager.addFromEnv('debug', 'DEBUG_KEY');
    
    const debugInfo = manager.getDebugInfo();
    
    expect(debugInfo.debug).toBe('debu********');
  });

  it('should support method chaining', () => {
    process.env.CHAIN_KEY = 'chain-value';
    
    const manager = new SecretsManager()
      .addFromEnv('chain1', 'CHAIN_KEY')
      .addFromEnv('chain2', 'CHAIN_KEY');
    
    expect(manager.listSecrets()).toEqual(['chain1', 'chain2']);
  });
});

describe('createMaskedLogger', () => {
  it('should mask secrets in log messages', () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    
    const maskedLogger = createMaskedLogger(mockLogger);
    
    maskedLogger.info('Loading secret', { API_KEY: 'secret-api-key' });
    
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Loading secret',
      { API_KEY: 'secr**********' }
    );
  });

  it('should handle multiple secrets', () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    
    const maskedLogger = createMaskedLogger(mockLogger);
    
    maskedLogger.info('Loading secrets', { 
      API_KEY: 'api-key', 
      DB_PASSWORD: 'db-password-12345' 
    });
    
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Loading secrets',
      { 
        API_KEY: 'api-***', 
        DB_PASSWORD: 'db-p*************' 
      }
    );
  });
});
